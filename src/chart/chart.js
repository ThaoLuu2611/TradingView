// ---------------------------------------------------------------------------
// chart.js – KLineChart wrapper for the TradingView-clone app
// ---------------------------------------------------------------------------

// KLineChart is loaded via CDN <script> tag — available as window.klinecharts
import { on, emit, get } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { fetchOHLCV } from '../api/binance.js'
import { fetchStockOHLCV } from '../api/yahoo.js'

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
    this._firstLoad = true

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

    // KLineChart v9: use setStyles() instead of setStyleOptions()
    this._chart.setStyles({
      yAxis: {
        autoScale: false
      },
      crosshair: {
        mode: 'normal'
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

    emit(EVENTS.LOADING, true)

    try {
      let data

      if (this._isCrypto(symbol)) {
        data = await fetchOHLCV(symbol, timeframe)
      } else {
        data = await fetchStockOHLCV(symbol, timeframe)
      }

      if (typeof this._chart.setSymbol === 'function') {
        this._chart.setSymbol(symbol)
      } else if (typeof this._chart.getChart === 'function') {
        const chartImp = this._chart.getChart()
        if (typeof chartImp.setSymbol === 'function') {
          chartImp.setSymbol(symbol)
        } else if (typeof chartImp._resetYAxisAutoCalcTickFlag === 'function') {
          chartImp._resetYAxisAutoCalcTickFlag()
        }
      }

      this._chart.applyNewData(data)
      emit(EVENTS.CHART_READY, true)

      // Fake Y-axis drag on first load to unlock vertical panning
      if (this._firstLoad) {
        this._firstLoad = false
        setTimeout(() => {
          try {
            const el = document.getElementById('chart-container')
            if (el) {
              const rect = el.getBoundingClientRect()
              const yAxisX = rect.right - 20
              const yStart = rect.top + 100
              const target = document.elementFromPoint(yAxisX, yStart) || el
              
              const downOpts = { bubbles: true, clientX: yAxisX, clientY: yStart, button: 0, buttons: 1, isPrimary: true, pointerId: 1, view: window }
              target.dispatchEvent(new PointerEvent('pointerdown', downOpts))
              target.dispatchEvent(new MouseEvent('mousedown', downOpts))
              
              const moveOpts = { bubbles: true, clientX: yAxisX, clientY: yStart + 50, button: 0, buttons: 1, isPrimary: true, pointerId: 1, view: window }
              target.dispatchEvent(new PointerEvent('pointermove', moveOpts))
              document.dispatchEvent(new PointerEvent('pointermove', moveOpts))
              target.dispatchEvent(new MouseEvent('mousemove', moveOpts))
              document.dispatchEvent(new MouseEvent('mousemove', moveOpts))
              
              const upOpts = { bubbles: true, clientX: yAxisX, clientY: yStart + 50, button: 0, buttons: 0, isPrimary: true, pointerId: 1, view: window }
              target.dispatchEvent(new PointerEvent('pointerup', upOpts))
              document.dispatchEvent(new PointerEvent('pointerup', upOpts))
              target.dispatchEvent(new MouseEvent('mouseup', upOpts))
              document.dispatchEvent(new MouseEvent('mouseup', upOpts))
            }
          } catch(e) {}
        }, 800)
      }

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

  /** Public getter so indicatorManager/drawingManager can access the chart instance */
  get chart() { return this._chart }
}

export const chartWrapper = new KLineChartWrapper()
