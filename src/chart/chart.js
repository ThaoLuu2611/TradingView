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
