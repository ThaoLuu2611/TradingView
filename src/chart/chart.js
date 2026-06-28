// ---------------------------------------------------------------------------
// chart.js – KLineChart wrapper for the TradingView-clone app
// ---------------------------------------------------------------------------

// KLineChart is loaded via CDN <script> tag — available as window.klinecharts
import { on, emit, get } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { paneControlManager } from '../ui/paneControls.js'
import { fetchOHLCV } from '../api/binance.js'
import { fetchStockOHLCV } from '../api/bitget-feed.js'

/** Known stock tickers that do NOT contain a dot but are equities, not crypto. */
const STOCK_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
  'TSLA', 'META', 'NFLX', 'AMD', 'INTC',
])

/** Crypto quote currencies that suffix a symbol (e.g. BTCUSDT, ETHBTC). */
const CRYPTO_SUFFIXES = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'USDC', 'DAI', 'TUSD']

class KLineChartWrapper {
  constructor() {
    /** @type {ReturnType<typeof klinecharts.init> | null} */
    this._chart = null

    /** @type {string | null} */
    this._candlePaneId = 'candle_pane'

    /** @type {string} */
    this._symbol = get('symbol') ?? 'BTCUSDT'

    /** @type {string} */
    this._timeframe = get('timeframe') ?? '1D'

    /** @type {number} */
    this._fetchId = 0
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Initialise the chart inside the given container element.
   * @param {string} containerId
   */
  init(containerId) {
    const el = document.getElementById(containerId)
    if (!el) {
      console.error(`[KLineChartWrapper] Element #${containerId} not found.`)
      return
    }

    this._chart = window.klinecharts.init(el)
    
    // --- Mobile Vertical Panning Fix ---
    // KLineChart v9 natively handles horizontal pan on touch, but ignores vertical pan.
    // We seamlessly inject vertical panning by computing the Y-axis extremum and forcing a redraw.
    let panStartY = null
    let panStartExtremum = null
    let isVerticalPanning = false
    let panYAxis = null

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // If touch is on the right scale (Y-axis), KLineChart handles the native Y-axis drag.
        const rect = el.getBoundingClientRect()
        if (e.touches[0].clientX - rect.left > rect.width - 70) {
          isVerticalPanning = false
          return
        }

        try {
          const pane = this._chart.getDrawPaneById('candle_pane')
          if (pane && typeof pane.getAxisComponent === 'function') {
            panYAxis = pane.getAxisComponent()
            // Only allow vertical panning if the Y-axis is explicitly unlocked
            if (panYAxis && !panYAxis.getAutoCalcTickFlag() && panYAxis.getScrollZoomEnabled()) {
              panStartY = e.touches[0].clientY
              const ext = panYAxis.getExtremum()
              panStartExtremum = { min: ext.min, max: ext.max, range: ext.range }
              isVerticalPanning = true
            } else {
              isVerticalPanning = false
            }
          }
        } catch (err) {}
      } else {
        isVerticalPanning = false
      }
    }, { capture: true, passive: true })

    el.addEventListener('touchmove', (e) => {
      if (isVerticalPanning && e.touches.length === 1 && panYAxis && panStartExtremum) {
        try {
          const pane = this._chart.getDrawPaneById('candle_pane')
          if (!pane) return
          
          const height = pane.getBounding().height
          // Distance dragging down means looking higher up the chart
          const distance = panStartY - e.touches[0].clientY
          
          const scale = distance / height
          const difRange = panStartExtremum.range * scale
          
          const newMin = panStartExtremum.min + difRange
          const newMax = panStartExtremum.max + difRange
          
          panYAxis.setExtremum({
            min: newMin,
            max: newMax,
            range: newMax - newMin,
            realMin: panYAxis.convertToRealValue(newMin),
            realMax: panYAxis.convertToRealValue(newMax),
            realRange: panYAxis.convertToRealValue(newMax) - panYAxis.convertToRealValue(newMin)
          })
          
          // Force an instant redraw so vertical panning is visible immediately
          this._chart.setStyles({})
        } catch (err) {}
      }
    }, { capture: true, passive: true })
    // ------------------------------


    this._applyStyles()

    // Wire up store events
    on(EVENTS.SYMBOL_CHANGE, (symbol) => {
      this._symbol = symbol
      this.loadData(symbol, this._timeframe)
    })

    on(EVENTS.TIMEFRAME_CHANGE, (timeframe) => {
      this._timeframe = timeframe
      this.loadData(this._symbol, timeframe)
    })

    on(EVENTS.CHARTTYPE_CHANGE, (type) => {
      this.setChartType(type)
    })

    // Resize on window resize
    window.addEventListener('resize', () => this.resize())

    // Initial data load
    this.loadData(this._symbol, this._timeframe)

    // Handle Keyboard Delete/Backspace
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (this._chart && this._selectedOverlayId) {
          this._chart.removeOverlay(this._selectedOverlayId)
          this._selectedOverlayId = null
        }
      }
    })

    // Handle context menu
    const chartContainer = document.getElementById('chart-container')
    const ctxMenu = document.getElementById('chartContextMenu')
    const ctxAddWl = document.getElementById('ctx-add-wl')
    
    if (chartContainer && ctxMenu && ctxAddWl) {
      chartContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        const symbol = get('symbol')
        const wl = get('watchlist')
        if (!symbol || !wl) return
        
        const inCrypto = wl.crypto && wl.crypto.includes(symbol)
        const inStocks = wl.stocks && wl.stocks.includes(symbol)
        const isInWatchlist = inCrypto || inStocks
        
        ctxAddWl.textContent = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'
        ctxMenu.style.display = 'block'
        
        // Ensure menu doesn't go off-screen
        let x = e.clientX
        let y = e.clientY
        const menuRect = ctxMenu.getBoundingClientRect()
        if (x + menuRect.width > window.innerWidth) x = window.innerWidth - menuRect.width
        if (y + menuRect.height > window.innerHeight) y = window.innerHeight - menuRect.height
        
        ctxMenu.style.left = x + 'px'
        ctxMenu.style.top = y + 'px'
      })
      
      document.addEventListener('click', (e) => {
        if (e.target !== ctxAddWl) {
          ctxMenu.style.display = 'none'
        }
      })
      
      ctxAddWl.addEventListener('click', () => {
        const symbol = get('symbol')
        const wl = get('watchlist')
        if (!symbol || !wl) return
        
        const inCrypto = wl.crypto && wl.crypto.includes(symbol)
        const inStocks = wl.stocks && wl.stocks.includes(symbol)
        const isInWatchlist = inCrypto || inStocks
        
        if (isInWatchlist) {
          if (inCrypto) wl.crypto = wl.crypto.filter(s => s !== symbol)
          if (inStocks) wl.stocks = wl.stocks.filter(s => s !== symbol)
          // Clone the object slightly to force trigger the set setter if needed
          set('watchlist', { ...wl })
          import('../store/store.js').then(({ forceSave }) => forceSave())
        } else {
          emit(EVENTS.WATCHLIST_ADD, symbol)
        }
        
        ctxMenu.style.display = 'none'
      })
    }
  }

  /**
   * Fetch OHLCV data and push it into the chart.
   * @param {string} symbol
   * @param {string} timeframe
   */
  async loadData(symbol, timeframe) {
    if (!this._chart) return

    const fetchId = ++this._fetchId
    emit(EVENTS.LOADING, true)

    try {
      let data

      if (this._isCrypto(symbol)) {
        data = await fetchOHLCV(symbol, timeframe)
      } else {
        data = await fetchStockOHLCV(symbol, timeframe)
      }

      // Ignore stale responses if user clicked another symbol while fetching
      if (this._fetchId !== fetchId) return

      // Detect precision dynamically based on latest price
      let pricePrec = 2
      if (data && data.length > 0) {
        const lastClose = data[data.length - 1].close
        if (lastClose < 0.1) pricePrec = 6
        else if (lastClose < 1) pricePrec = 5
        else if (lastClose < 50) pricePrec = 4
      }

      // Reset Y-axis scale and precision to avoid locking into a previous symbol's scale
      this._chart.setPriceVolumePrecision(pricePrec, 2)
      this._chart.setStyles({ yAxis: { autoScale: true } })

      // 1. Lưu lại mốc thời gian (timestamp) của nến đang hiển thị và vị trí vật lý của nó
      let targetTimestamp = null
      let targetPhysicalDistance = 0
      let currentBarSpace = 6
      
      if (this._chart && typeof this._chart.getDataList === 'function' && typeof this._chart.getVisibleRange === 'function') {
        try {
          const oldData = this._chart.getDataList()
          const range = this._chart.getVisibleRange()
          
          if (oldData && oldData.length > 0 && range && range.to > 0) {
            // Lấy nến ở sát mép phải màn hình nhất (range.to thường là index bên ngoài màn hình 1 chút, ta lùi lại 1)
            const rightIndex = Math.min(range.to - 1, oldData.length - 1)
            if (oldData[rightIndex]) {
              targetTimestamp = oldData[rightIndex].timestamp
              
              if (typeof this._chart.getBarSpace === 'function') {
                currentBarSpace = this._chart.getBarSpace() || 6
              }
              
              let oldOffsetRight = 50
              if (typeof this._chart.getOffsetRightDistance === 'function') {
                oldOffsetRight = this._chart.getOffsetRightDistance()
              }
              
              // Tính khoảng cách vật lý (pixel) từ nến target đến lề phải của widget
              targetPhysicalDistance = oldOffsetRight + ((oldData.length - 1) - rightIndex) * currentBarSpace
            }
          }
        } catch (e) {
          console.warn('Could not save scroll state:', e)
        }
      }

      // Force reset Y-axis manual zoom in KLineChart v9 for ALL panes
      try {
        // Reset main candle pane
        const mainPane = this._chart.getDrawPaneById('candle_pane')
        if (mainPane && typeof mainPane.getAxisComponent === 'function') {
          const yAxis = mainPane.getAxisComponent()
          if (yAxis && typeof yAxis.setAutoCalcTickFlag === 'function') {
            yAxis.setAutoCalcTickFlag(true)
          }
        }
        
        // Reset all indicator panes
        // In KLineChart v9, indicator panes start with 'indicator_pane_' or similar
        // Since we don't have a getPanes() method, we can just reset autoScale globally via styles if needed
        // OR we can rely on the fact that indicator panes usually auto-scale by default unless dragged.
        // Actually, let's try to reset known indicators if we have paneManager tracking them
      } catch (e) {}

      // KLineChart's applyNewData destroys our custom DOM elements in the panes when it recalculates asynchronously.
      // We pass a callback as the 3rd argument to safely rebuild them exactly after KLineChart finishes its DOM updates.
      this._chart.applyNewData(data, false, () => {
        try {
          paneControlManager.rebuildAll()
        } catch (e) {}
        
        // 2. Phục hồi lại đúng mốc thời gian đó cho mã mới ở vị trí vật lý y hệt
        if (targetTimestamp && data && data.length > 0 && typeof this._chart.setOffsetRightDistance === 'function') {
          let newIndex = data.length - 1
          for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].timestamp <= targetTimestamp) {
              newIndex = i
              break
            }
          }
          
          // Tính toán khoảng cách (pixel) từ nến đó đến lề phải của mảng dữ liệu mới
          const newDistanceToLastData = ((data.length - 1) - newIndex) * currentBarSpace
          
          // Tính toán offset cần thiết để nến ở newIndex nằm đúng vị trí vật lý cũ
          let newOffsetRight = targetPhysicalDistance - newDistanceToLastData
          
          this._chart.setOffsetRightDistance(newOffsetRight)
        }
      })

      emit(EVENTS.CHART_READY, true)

    } catch (err) {
      console.error('[KLineChartWrapper] loadData error:', err)
      emit(EVENTS.ERROR, err.message ?? String(err))
    } finally {
      emit(EVENTS.LOADING, false)
    }
  }

  /**
   * Switch between candlestick and area/line chart types.
   * @param {'candle' | 'line' | 'area'} type
   */
  setChartType(type) {
    if (!this._chart) return
    // v9: setStyles()
    const candleType = type === 'candle' ? 'candle_solid' : 'area'
    this._chart.setStyles({ candle: { type: candleType } })
  }

  /**
   * Trigger a chart resize (e.g. after layout changes).
   */
  resize() {
    this._chart?.resize()
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  _bindEvents() {
    on(EVENTS.DRAWING_TOOL, (subtool) => {
      if (!this._chart) return
      this._chart.createOverlay({
        name: subtool,
        onSelected: ({ overlay }) => {
          this._selectedOverlayId = overlay.id
          return true
        },
        onDeselected: ({ overlay }) => {
          if (this._selectedOverlayId === overlay.id) {
            this._selectedOverlayId = null
          }
          return true
        },
        onRightClick: ({ overlay }) => {
          this._chart.removeOverlay(overlay.id)
          if (this._selectedOverlayId === overlay.id) {
            this._selectedOverlayId = null
          }
          return true
        }
      })
    })

    on(EVENTS.DRAWING_CLEAR, () => {
      if (this._chart) {
        if (this._selectedOverlayId) {
          this._chart.removeOverlay(this._selectedOverlayId)
          this._selectedOverlayId = null
        } else {
          this._chart.removeOverlay()
        }
      }
    })
  }

  /**
   * Determine whether a symbol is a crypto pair.
   * Returns `true` when the symbol ends with a known crypto quote currency
   * AND is not in the known stock list.
   * @param {string} symbol
   * @returns {boolean}
   */
  _isCrypto(symbol) {
    if (STOCK_SYMBOLS.has(symbol.toUpperCase())) return false
    if (symbol.includes('.')) return false
    return CRYPTO_SUFFIXES.some((suffix) =>
      symbol.toUpperCase().endsWith(suffix),
    )
  }

  /** Apply default chart styles */
  _applyStyles() {
    if (!this._chart) return
    this._chart.setStyles({
      yAxis: {
        autoScale: true,
        tickText: { color: '#434651', size: 13, weight: 'normal' }
      },
      xAxis: {
        tickText: { color: '#434651', size: 13, weight: 'normal' }
      },
      crosshair: {
        mode: 'normal',
        horizontal: { text: { size: 13, color: '#ffffff', backgroundColor: '#131722' } },
        vertical: { text: { size: 13, color: '#ffffff', backgroundColor: '#131722' } }
      },
      indicator: {
        lastValueMark: { text: { size: 13, weight: 'normal' } },
        tooltip: { text: { size: 14, color: '#434651', weight: 'normal' } }
      },
      grid: {
        show: true,
        horizontal: { color: '#f0f3fa', size: 1, style: 'solid', dashedValue: [2,2] },
        vertical:   { color: '#f0f3fa', size: 1, style: 'solid', dashedValue: [2,2] },
      },
      overlay: {
        point: {
          color: '#ffffff',
          borderColor: '#2962ff',
          borderSize: 1,
          radius: 4,
          activeColor: '#ffffff',
          activeBorderColor: '#2962ff',
          activeBorderSize: 2,
          activeRadius: 5,
        }
      },
      candle: {
        type: 'candle_solid',
        tooltip: {
          text: { size: 14, color: '#434651', weight: 'normal' }
        },
        bar: {
          upColor:         '#26a69a',
          downColor:       '#ef5350',
          noChangeColor:   '#26a69a',
          upBorderColor:   '#26a69a',
          downBorderColor: '#ef5350',
          upWickColor:     '#26a69a',
          downWickColor:   '#ef5350',
        },
        area: {
          lineColor: '#26a69a',
          backgroundColor: [
            { offset: 0, color: 'rgba(38,166,154,0.35)' },
            { offset: 1, color: 'rgba(38,166,154,0.02)' },
          ],
        },
      },
    })
  }

  /** Public getter so indicatorManager/drawingManager can access the chart instance */
  get chart() { return this._chart }
}

export const chartWrapper = new KLineChartWrapper()
