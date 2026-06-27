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

    // --- Mobile Full Touch Support (Pan, Zoom, Crosshair) ---
    const activePointers = new Map()
    let fakeMouseX = 0
    let fakeMouseY = 0
    let startX = 0
    let startY = 0
    let lastDistance = null
    let isFakingMouse = false
    let isPinching = false
    let isHovering = false
    let isRightEdge = false
    let longPressTimeout = null

    const dispatchFakePointer = (target, originalEvent, newType, x, y, buttons) => {
      const init = {
        bubbles: true, cancelable: true,
        clientX: x, clientY: y,
        screenX: x, screenY: y,
        button: buttons === 1 ? 0 : -1, buttons: buttons,
        pointerId: 1, pointerType: 'mouse', isPrimary: true
      }
      target.dispatchEvent(new PointerEvent(newType, init))
      target.dispatchEvent(new MouseEvent(newType.replace('pointer', 'mouse'), init))
    }

    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        const rect = el.getBoundingClientRect()
        const onRightEdge = e.clientX - rect.left > rect.width - 70

        if (activePointers.size === 0) {
          isRightEdge = onRightEdge
        }

        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        e.stopPropagation()
        e.preventDefault()

        if (activePointers.size === 1) {
          isFakingMouse = true
          isPinching = false
          isHovering = false
          fakeMouseX = e.clientX
          fakeMouseY = e.clientY
          startX = e.clientX
          startY = e.clientY

          dispatchFakePointer(e.target, e, 'pointerdown', fakeMouseX, fakeMouseY, 1)

          // Long press detection for crosshair
          if (longPressTimeout) clearTimeout(longPressTimeout)
          longPressTimeout = setTimeout(() => {
            if (activePointers.size === 1 && isFakingMouse) {
              // Release the drag
              dispatchFakePointer(el, e, 'pointerup', fakeMouseX, fakeMouseY, 0)
              isFakingMouse = false
              isHovering = true
              // Start hovering to show crosshair
              dispatchFakePointer(el, e, 'pointermove', fakeMouseX, fakeMouseY, 0)
            }
          }, 400)
        } else if (activePointers.size === 2) {
          if (longPressTimeout) clearTimeout(longPressTimeout)
          if (isFakingMouse) {
            isFakingMouse = false
            dispatchFakePointer(e.target, e, 'pointerup', fakeMouseX, fakeMouseY, 0)
          }
          if (isHovering) {
            isHovering = false
            dispatchFakePointer(e.target, e, 'pointerleave', fakeMouseX, fakeMouseY, 0)
          }
          
          isPinching = true
          const pts = Array.from(activePointers.values())
          lastDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
          
          if (isRightEdge) {
            fakeMouseX = rect.right - 10
            fakeMouseY = (pts[0].y + pts[1].y) / 2
            dispatchFakePointer(el, e, 'pointerdown', fakeMouseX, fakeMouseY, 1)
          }
        }
      }
    }, { capture: true })

    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        if (!activePointers.has(e.pointerId)) return
        const ptr = activePointers.get(e.pointerId)
        ptr.x = e.clientX
        ptr.y = e.clientY
        
        e.stopPropagation()
        if (e.cancelable) e.preventDefault()

        if (activePointers.size === 1) {
          fakeMouseX = e.clientX
          fakeMouseY = e.clientY

          // Cancel long press if moved too much
          if (longPressTimeout) {
            if (Math.hypot(fakeMouseX - startX, fakeMouseY - startY) > 10) {
              clearTimeout(longPressTimeout)
              longPressTimeout = null
            }
          }

          if (isFakingMouse) {
            dispatchFakePointer(e.target, e, 'pointermove', fakeMouseX, fakeMouseY, 1)
          } else if (isHovering) {
            dispatchFakePointer(e.target, e, 'pointermove', fakeMouseX, fakeMouseY, 0)
          }
        } else if (activePointers.size === 2 && isPinching) {
          const pts = Array.from(activePointers.values())
          const currentDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
          if (lastDistance !== null) {
            const diff = currentDistance - lastDistance
            
            if (isRightEdge) {
              fakeMouseY += diff
              dispatchFakePointer(el, e, 'pointermove', fakeMouseX, fakeMouseY, 1)
            } else {
              const centerX = (pts[0].x + pts[1].x) / 2
              const centerY = (pts[0].y + pts[1].y) / 2
              const wheelEvent = new WheelEvent('wheel', {
                deltaY: -diff * 3,
                clientX: centerX,
                clientY: centerY,
                bubbles: true,
                cancelable: true
              })
              el.dispatchEvent(wheelEvent)
            }
          }
          lastDistance = currentDistance
        }
      }
    }, { capture: true, passive: false })

    const endPointer = (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        if (activePointers.has(e.pointerId)) {
          activePointers.delete(e.pointerId)
          e.stopPropagation()
          
          if (longPressTimeout) {
            clearTimeout(longPressTimeout)
            longPressTimeout = null
          }
          
          if (activePointers.size === 1) {
            isPinching = false
            const ptr = Array.from(activePointers.values())[0]
            fakeMouseX = ptr.x
            fakeMouseY = ptr.y
            isFakingMouse = true
            dispatchFakePointer(e.target, e, 'pointerdown', fakeMouseX, fakeMouseY, 1)
          } else if (activePointers.size === 0) {
            if (isFakingMouse || isRightEdge) {
              dispatchFakePointer(e.target, e, e.type === 'pointercancel' ? 'pointercancel' : 'pointerup', fakeMouseX, fakeMouseY, 0)
            }
            if (isHovering) {
              dispatchFakePointer(e.target, e, 'pointerleave', fakeMouseX, fakeMouseY, 0)
            }
            isFakingMouse = false
            isPinching = false
            isHovering = false
            isRightEdge = false
          }
        }
      }
    }
    el.addEventListener('pointerup', endPointer, { capture: true })
    el.addEventListener('pointercancel', endPointer, { capture: true })

    const stopTouch = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault() }
    el.addEventListener('touchstart', stopTouch, { capture: true, passive: false })
    el.addEventListener('touchmove', stopTouch, { capture: true, passive: false })
    el.addEventListener('touchend', stopTouch, { capture: true, passive: false })
    el.addEventListener('touchcancel', stopTouch, { capture: true, passive: false })
    // ------------------------------

    // KLineChart v9: use setStyles() instead of setStyleOptions()
    this._chart.setStyles({
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

      this._chart.applyNewData(data)
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

  /** Public getter so indicatorManager/drawingManager can access the chart instance */
  get chart() { return this._chart }
}

export const chartWrapper = new KLineChartWrapper()
