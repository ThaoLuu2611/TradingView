// ---------------------------------------------------------------------------
// chart.js – KLineChart wrapper for the TradingView-clone app
// ---------------------------------------------------------------------------

// KLineChart is loaded via CDN <script> tag — available as window.klinecharts
import { on, emit, get } from '../store/store.js'
import { EVENTS } from '../store/events.js'
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

    // --- Mobile Y-Axis Drag & Pinch Fix ---
    // Expand Y-axis touch hitbox and support both 1-finger drag and 2-finger pinch on the Y-axis.
    const activePointers = new Map()
    let fakeMouseY = 0
    let lastDistance = null
    let isFakingMouse = false

    const dispatchFakePointer = (target, originalEvent, newType, y, buttons) => {
      const init = {
        bubbles: true, cancelable: true,
        clientX: originalEvent.clientX, clientY: y,
        screenX: originalEvent.screenX, screenY: y,
        button: 0, buttons: buttons,
        pointerId: 1, // use a fake pointer id
        pointerType: 'mouse',
        isPrimary: true
      }
      target.dispatchEvent(new PointerEvent(newType, init))
      target.dispatchEvent(new MouseEvent(newType.replace('pointer', 'mouse'), init))
    }

    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        const rect = el.getBoundingClientRect()
        // If touch is within 70px of the right edge
        if (e.clientX - rect.left > rect.width - 70) {
          if (e.target.closest('.pane-controls')) return
          
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, lastY: e.clientY })
          e.stopPropagation()
          e.preventDefault()

          if (activePointers.size === 1) {
            isFakingMouse = true
            fakeMouseY = e.clientY
            dispatchFakePointer(e.target, e, 'pointerdown', fakeMouseY, 1)
          } else if (activePointers.size === 2) {
            const pts = Array.from(activePointers.values())
            lastDistance = Math.abs(pts[0].y - pts[1].y)
          }
        }
      }
    }, { capture: true })

    el.addEventListener('pointermove', (e) => {
      if (activePointers.has(e.pointerId)) {
        const ptr = activePointers.get(e.pointerId)
        const dy = e.clientY - ptr.lastY
        ptr.x = e.clientX
        ptr.y = e.clientY
        ptr.lastY = e.clientY
        
        e.stopPropagation()
        if (e.cancelable) e.preventDefault()

        if (activePointers.size === 1) {
          fakeMouseY += dy
          dispatchFakePointer(e.target, e, 'pointermove', fakeMouseY, 1)
        } else if (activePointers.size === 2) {
          const pts = Array.from(activePointers.values())
          const currentDistance = Math.abs(pts[0].y - pts[1].y)
          if (lastDistance !== null) {
            const diff = currentDistance - lastDistance
            // Spread (+) -> fakeMouseY increases (simulating dragging price scale down -> zoom in)
            // Pinch (-) -> fakeMouseY decreases (simulating dragging price scale up -> zoom out)
            fakeMouseY += diff
            dispatchFakePointer(e.target, e, 'pointermove', fakeMouseY, 1)
          }
          lastDistance = currentDistance
        }
      }
    }, { capture: true, passive: false })

    const endPointer = (e) => {
      if (activePointers.has(e.pointerId)) {
        activePointers.delete(e.pointerId)
        e.stopPropagation()
        
        if (activePointers.size === 1) {
          lastDistance = null
        } else if (activePointers.size === 0 && isFakingMouse) {
          isFakingMouse = false
          lastDistance = null
          const upType = e.type === 'pointercancel' ? 'pointercancel' : 'pointerup'
          dispatchFakePointer(e.target, e, upType, fakeMouseY, 0)
        }
      }
    }
    el.addEventListener('pointerup', endPointer, { capture: true })
    el.addEventListener('pointercancel', endPointer, { capture: true })
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

      // 1.5 Xóa sạch dữ liệu cũ để ép biểu đồ reset lại các zoom Y-axis (tránh bị kẹt scale của mã cũ)
      // Mặc dù gọi clearData, ta vẫn có thể khôi phục lại vị trí X nhờ biến targetPhysicalDistance đã lưu ở trên
      if (typeof this._chart.clearData === 'function') {
        this._chart.clearData()
      }
      
      // Force reset Y-axis manual zoom in KLineChart v9
      try {
        const pane = this._chart.getDrawPaneById('candle_pane')
        if (pane && typeof pane.getAxisComponent === 'function') {
          const yAxis = pane.getAxisComponent()
          if (yAxis && typeof yAxis.setAutoCalcTickFlag === 'function') {
            yAxis.setAutoCalcTickFlag(true)
          }
        }
      } catch (e) {}

      this._chart.applyNewData(data)

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
