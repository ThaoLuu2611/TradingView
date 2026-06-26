// ---------------------------------------------------------------------------
// store.js – Lightweight pub/sub store for the TradingView-clone app
// ---------------------------------------------------------------------------

const _state = {
  symbol:              'BTCUSDT',
  timeframe:           '1D',
  chartType:           'candle',
  activeDrawingTool:   'trendline',
  activeDrawingSubtool:'trendline',
  indicators: {
    MA:   { enabled: false, period: 20, color: '#f59e0b' },
    EMA:  { enabled: false, period: 20 },
    BB:   { enabled: false, period: 20 },
    RSI:  { enabled: true,  period: 14 },
    MACD: { enabled: false },
    KDJ:  { enabled: false },
    WR:   { enabled: false, period: 14 },
  },
  activeTab:  'crypto',
  watchlist: {
    crypto: [
      'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT',
      'ADAUSDT','DOGEUSDT','AVAXUSDT','DOTUSDT','MATICUSDT',
      'LTCUSDT','LINKUSDT','TONUSDT','NEARUSDT','APTUSDT',
    ],
    stocks: [
      'AAPL','MSFT','GOOGL','AMZN','NVDA',
      'TSLA','META','NFLX','AMD','INTC',
    ],
  },
  pinnedTimeframes: ['1m','5m','15m','1h','4h','1D','1W'],
  loading: false,
  error:   null,
}

/** @type {Map<string, Set<Function>>} */
const _listeners = new Map()

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read a value from the store.
 * @param {string} key
 * @returns {*}
 */
export function get(key) {
  return _state[key]
}

/**
 * Write a value into the store and emit a `state:<key>` event.
 * @param {string} key
 * @param {*} value
 */
export function set(key, value) {
  _state[key] = value
  emit(`state:${key}`, value)
}

/**
 * Subscribe to a named event.
 * @param {string} event
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export function on(event, callback) {
  if (!_listeners.has(event)) {
    _listeners.set(event, new Set())
  }
  _listeners.get(event).add(callback)

  // Return an unsubscribe helper
  return () => {
    const callbacks = _listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) _listeners.delete(event)
    }
  }
}

/**
 * Publish a named event with an optional payload.
 * @param {string} event
 * @param {*} [payload]
 */
export function emit(event, payload) {
  const callbacks = _listeners.get(event)
  if (!callbacks) return
  for (const cb of callbacks) {
    try {
      cb(payload)
    } catch (err) {
      console.error(`[store] Error in listener for "${event}":`, err)
    }
  }
}
