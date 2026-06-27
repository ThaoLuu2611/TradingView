// ---------------------------------------------------------------------------
// store.js – Lightweight pub/sub store for the TradingView-clone app
// ---------------------------------------------------------------------------

export const DEFAULT_INDICATORS = {
  MA: { enabled: false, calcParams: [7, 25, 99], lines: [{ period: 7, color: '#fcc201', enabled: true }, { period: 25, color: '#e83d8c', enabled: true }, { period: 99, color: '#9b7ef6', enabled: true }] },
  EMA: { enabled: true, calcParams: [34, 89, 200], lines: [{ period: 34, color: '#fcc201', enabled: true }, { period: 89, color: '#e83d8c', enabled: true }, { period: 200, color: '#9b7ef6', enabled: true }] },
  BB: { enabled: false, calcParams: [20, 2], lines: [{ period: 20, color: '#9b7ef6', enabled: true }, { period: 20, color: '#fcc201', enabled: true }, { period: 20, color: '#e83d8c', enabled: true }] },
  RSI: { enabled: true, calcParams: [14], lines: [{ period: 14, color: '#9c27b0', enabled: true }] },
  MACD: { enabled: true, calcParams: [12, 26, 9], lines: [{ period: 12, color: '#e83d8c', enabled: true }, { period: 26, color: '#2962ff', enabled: true }] },
  KDJ: { enabled: false, calcParams: [9, 3, 3], lines: [{ period: 9, color: '#fcc201', enabled: true }, { period: 3, color: '#e83d8c', enabled: true }, { period: 3, color: '#9b7ef6', enabled: true }] },
  WR: { enabled: false, calcParams: [14], lines: [{ period: 14, color: '#ff9800', enabled: true }] },
  StochRSI: { enabled: false, calcParams: [14, 14, 3, 3], lines: [{ period: 14, color: '#2962ff', enabled: true }, { period: 14, color: '#00bcd4', enabled: true }] },
  ClusterAlgo: { enabled: false, calcParams: [14, 20, 2], lines: [{ period: 'RSI', color: '#26a69a', enabled: true }, { period: 'Basis', color: '#ef5350', enabled: true }, { period: 'Up', color: '#787b86', enabled: true }, { period: 'Dn', color: '#787b86', enabled: true }] },
};

const _state = {
  symbol:              'BTCUSDT',
  timeframe:           '1D',
  chartType:           'candle',
  activeDrawingTool:   'trendline',
  activeDrawingSubtool:'trendline',
  indicators:          JSON.parse(JSON.stringify(DEFAULT_INDICATORS)),
  activeTab:           'crypto',
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
  pinnedTimeframes: ['15m','1h','4h','1D','1W'],
  customIntervals:  [],   // [{tf, label, unit, value, seconds}]
  loading: false,
  error:   null,
}

/** @type {Map<string, Set<Function>>} */
const _listeners = new Map()

// ---------------------------------------------------------------------------
// Persistence — tự động save/load vào localStorage
// ---------------------------------------------------------------------------

const PERSIST_KEYS = ['indicators', 'pinnedTimeframes', 'customIntervals', 'timeframe', 'watchlist']
const LS_PREFIX    = 'chartpro:'

// Restore persisted state on module load
for (const key of PERSIST_KEYS) {
  try {
    const saved = localStorage.getItem(LS_PREFIX + key)
    if (saved != null) {
      const parsed = JSON.parse(saved)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        // Merge objects (like indicators) deeply so new defaults aren't lost
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'object' && v !== null && !Array.isArray(v) && _state[key][k]) {
            _state[key][k] = { ..._state[key][k], ...v }
          } else {
            _state[key][k] = v
          }
        }
      } else {
        // Arrays or primitives
        _state[key] = parsed
      }
    }
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Force save all persistable state to localStorage manually
 */
export function forceSave() {
  for (const key of PERSIST_KEYS) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(_state[key]))
    } catch (_) {}
  }
}

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
