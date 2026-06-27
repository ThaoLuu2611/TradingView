// ---------------------------------------------------------------------------
// chart.js – KLineChart wrapper (v10)
// ---------------------------------------------------------------------------

// KLineChart is loaded via CDN <script> tag — available as window.klinecharts
import { on, emit, get, set } from '../store/store.js'
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

/**
 * Map app timeframe strings → KLineChart v10 Period objects.
 * v10 requires { type: PeriodType, span: number }.
 */
const TIMEFRAME_TO_PERIOD = {
  '1m':  { type: 'minute', span: 1 },
  '3m':  { type: 'minute', span: 3 },
  '5m':  { type: 'minute', span: 5 },
  '10m': { type: 'minute', span: 10 },
  '15m': { type: 'minute', span: 15 },
  '30m': { type: 'minute', span: 30 },
  '45m': { type: 'minute', span: 45 },
  '1h':  { type: 'hour', span: 1 },
  '2h':  { type: 'hour', span: 2 },
  '3h':  { type: 'hour', span: 3 },
  '4h':  { type: 'hour', span: 4 },
  '6h':  { type: 'hour', span: 6 },
  '12h': { type: 'hour', span: 12 },
  '1D':  { type: 'day', span: 1 },
  '3D':  { type: 'day', span: 3 },
  '1W':  { type: 'week', span: 1 },
  '1M':  { type: 'month', span: 1 },
}

class KLineChartWrapper {
  constructor() {
    /** @type {ReturnType<typeof klinecharts.init> | null} */
    this._chart = null

    /** @type {string} */
    this._candlePaneId = 'candle_pane'

    /** @type {string} */
    this._symbol = get('symbol') ?? 'BTCUSDT'

    /** @type {string} */
    this._timeframe = get('timeframe') ?? '1D'

    /** @type {string | null} */
    this._selectedOverlayId = null
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

    // v10: pass styles directly into init() so they apply before the first render frame
    this._chart = window.klinecharts.init(el, { styles: this._buildStyles() })

    // Force resize so the canvas gets correct dimensions from the flex layout
    this._chart.resize()

    // v10: register data loader — chart calls getBars({ type: 'init' }) when ready
    this._chart.setDataLoader({
      getBars: async ({ type, timestamp, symbol, period, callback }) => {
        if (type === 'init') emit(EVENTS.LOADING, true)
        try {
          const sym = symbol.ticker
          let data

          if (type !== 'init' && type !== 'backward') {
            callback([], false)
            return
          }

          // backward = user scrolled left; timestamp = earliest candle loaded
          const endTimestamp = (type === 'backward' && timestamp) ? timestamp - 1 : undefined

          if (this._isCrypto(sym)) {
            const limit = (type === 'backward') ? 500 : 3500
            data = await fetchOHLCV(sym, this._timeframe, limit, endTimestamp)
          } else {
            if (type === 'backward') {
              // Yahoo API not paginated yet, return empty to prevent duplicate blocks
              data = []
            } else {
              data = await fetchStockOHLCV(sym, this._timeframe)
            }
          }

          // more=true means there might be more historical data to load backward
          const more = (type !== 'backward') ? true : data.length >= 500
          callback(data, more)

          if (type === 'init') {
            emit(EVENTS.CHART_READY, true)
            emit(EVENTS.LOADING, false)
          }
        } catch (err) {
          console.error('[KLineChartWrapper] getBars error:', err)
          callback([], false)
          if (type === 'init') emit(EVENTS.LOADING, false)
        }
      },
    })

    // Set period FIRST (no getBars yet since symbol is null)
    // then symbol — v10 triggers getBars only when both are set
    this._chart.setPeriod(this._timeframeToPeriod(this._timeframe))
    this._chart.setSymbol({ ticker: this._symbol })

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

    // Handle Keyboard Delete/Backspace
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (this._chart && this._selectedOverlayId) {
          // v10: removeOverlay takes a filter object
          this._chart.removeOverlay({ id: this._selectedOverlayId })
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
          set('watchlist', { ...wl })
          import('../store/store.js').then(({ forceSave }) => forceSave())
        } else {
          emit(EVENTS.WATCHLIST_ADD, symbol)
        }

        ctxMenu.style.display = 'none'
      })
    }

    this._bindEvents()
  }

  /**
   * Change symbol and/or timeframe — triggers a fresh data load via DataLoader.
   * @param {string} symbol
   * @param {string} timeframe
   */
  loadData(symbol, timeframe) {
    if (!this._chart) return
    this._symbol = symbol
    this._timeframe = timeframe
    // v10: setting symbol or period triggers getBars({ type: 'init' }) automatically
    this._chart.setSymbol({ ticker: symbol })
    this._chart.setPeriod(this._timeframeToPeriod(timeframe))
  }

  /**
   * Switch between candlestick and area/line chart types.
   * @param {'candle' | 'line' | 'area'} type
   */
  setChartType(type) {
    if (!this._chart) return
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
          // v10: removeOverlay takes a filter object
          this._chart.removeOverlay({ id: overlay.id })
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
          this._chart.removeOverlay({ id: this._selectedOverlayId })
          this._selectedOverlayId = null
        } else {
          this._chart.removeOverlay()
        }
      }
    })
  }

  /**
   * Determine whether a symbol is a crypto pair.
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

  /**
   * Convert app timeframe string to KLineChart v10 Period object.
   * @param {string} tf
   * @returns {{ type: string, span: number }}
   */
  _timeframeToPeriod(tf) {
    return TIMEFRAME_TO_PERIOD[tf] ?? { type: 'day', span: 1 }
  }

  /** Build styles object — also used in init() options for first-frame correctness */
  _buildStyles() {
    return {
      yAxis: {
        tickText: { color: '#434651', size: 13, weight: 'normal' }
      },
      xAxis: {
        tickText: { color: '#434651', size: 13, weight: 'normal' }
      },
      crosshair: {
        horizontal: {
          text: { size: 13, color: '#ffffff', backgroundColor: '#131722' }
        },
        vertical: {
          text: { size: 13, color: '#ffffff', backgroundColor: '#131722' }
        }
      },
      indicator: {
        lastValueMark: { text: { size: 13, weight: 'normal' } },
        tooltip: {
          title: {
            show: true,
            color: '#434651',
            size: 11,
            showName: false,
            showParams: false,
          },
          legend: { color: '#434651', size: 14, weight: 'normal' }
        }
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
          showRule: 'none',
          legend: { color: '#434651', size: 14, weight: 'normal' }
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
    }
  }

  /** Public getter so indicatorManager/drawingManager can access the chart instance */
  get chart() { return this._chart }
}

export const chartWrapper = new KLineChartWrapper()
