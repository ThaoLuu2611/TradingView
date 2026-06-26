// Binance supported: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
// Unsupported ones are mapped to nearest supported interval
const INTERVAL_MAP = {
  // Minutes
  '1m':  '1m',
  '2m':  '3m',
  '3m':  '3m',
  '5m':  '5m',
  '10m': '15m',
  '15m': '15m',
  '30m': '30m',
  '45m': '1h',
  // Hours
  '1h':  '1h',
  '2h':  '2h',
  '3h':  '4h',
  '4h':  '4h',
  '6h':  '6h',
  '12h': '12h',
  // Days
  '1D':  '1d',
  '2D':  '3d',
  '3D':  '3d',
  '4D':  '3d',
  // Weeks
  '1W':  '1w',
  '2W':  '1w',
  '3W':  '1w',
  // Months
  '1M':  '1M',
  '3M':  '1M',
  '6M':  '1M',
  '12M': '1M',
}

// Binance intervals in seconds — dùng để fallback custom intervals
const BINANCE_FALLBACK = [
  { bi:'1m',  sec:60 },   { bi:'3m',  sec:180 },  { bi:'5m',  sec:300 },
  { bi:'15m', sec:900 },  { bi:'30m', sec:1800 },  { bi:'1h',  sec:3600 },
  { bi:'2h',  sec:7200 }, { bi:'4h',  sec:14400 }, { bi:'6h',  sec:21600 },
  { bi:'8h',  sec:28800 },{ bi:'12h', sec:43200 }, { bi:'1d',  sec:86400 },
  { bi:'3d',  sec:259200},{ bi:'1w',  sec:604800 },{ bi:'1M',  sec:2592000 },
]
const UNIT_SEC_BI = { s:1, m:60, h:3600, D:86400, W:604800, M:2592000 }

function nearestBinanceInterval(tf) {
  const m = tf.match(/^(\d+)([smhDWM])$/)
  if (!m) return null
  const sec = parseInt(m[1]) * (UNIT_SEC_BI[m[2]] ?? 1)
  let best = BINANCE_FALLBACK[0]
  let minD = Infinity
  for (const row of BINANCE_FALLBACK) {
    const d = Math.abs(sec - row.sec)
    if (d < minD) { minD = d; best = row }
  }
  return best.bi
}

/**
 * Returns [{timestamp, open, high, low, close, volume}, ...] sorted ascending
 * @param {string} symbol - e.g. 'BTCUSDT'
 * @param {string} interval - app format e.g. '1m', '1h', '1D', hoặc custom '7m'
 * @param {number} limit - number of candles to fetch (default 500)
 */
export async function fetchOHLCV(symbol, interval, limit = 500) {
  // Ưu tiên map tĩnh, fallback về interval gần nhất cho custom intervals
  const binanceInterval = INTERVAL_MAP[interval] ?? nearestBinanceInterval(interval)
  if (!binanceInterval) {
    throw new Error(`Unsupported interval: ${interval}`)
  }

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Binance returns: [openTime, open, high, low, close, volume, closeTime, ...]
  return data.map(([openTime, open, high, low, close, volume]) => ({
    timestamp: openTime,
    open: +open,
    high: +high,
    low: +low,
    close: +close,
    volume: +volume,
  }));
  // Already sorted ascending by Binance
}
