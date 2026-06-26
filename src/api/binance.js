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

/**
 * Returns [{timestamp, open, high, low, close, volume}, ...] sorted ascending
 * @param {string} symbol - e.g. 'BTCUSDT'
 * @param {string} interval - app format e.g. '1m', '1h', '1D'
 * @param {number} limit - number of candles to fetch (default 500)
 */
export async function fetchOHLCV(symbol, interval, limit = 500) {
  const binanceInterval = INTERVAL_MAP[interval];
  if (!binanceInterval) {
    throw new Error(`Unsupported interval: ${interval}`);
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
