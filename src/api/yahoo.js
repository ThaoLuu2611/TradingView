// ---------------------------------------------------------------------------
// yahoo.js – Stock OHLCV + price feed (Yahoo Finance via CORS proxy)
// ---------------------------------------------------------------------------
// Yahoo Finance blocks direct browser CORS requests.
// Solution: route through allorigins.win free CORS proxy (no key needed).
// ---------------------------------------------------------------------------

import { emit, get, on } from '../store/store.js'
import { EVENTS } from '../store/events.js'

// ---------------------------------------------------------------------------
// CORS proxy list — thử lần lượt nếu cái đầu fail
// ---------------------------------------------------------------------------
const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

async function proxyFetch(url) {
  let lastErr
  for (const makeUrl of PROXIES) {
    try {
      const res = await fetch(makeUrl(url), { signal: AbortSignal.timeout(8000) })
      if (res.ok) return res
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('All proxies failed')
}

// ---------------------------------------------------------------------------
// Interval maps
// ---------------------------------------------------------------------------
// Yahoo Finance supported: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo
// Unsupported ones mapped to nearest supported
const INTERVAL_MAP = {
  // Minutes
  '1m':  '1m',
  '2m':  '2m',
  '3m':  '5m',
  '5m':  '5m',
  '10m': '15m',
  '15m': '15m',
  '30m': '30m',
  '45m': '60m',
  // Hours
  '1h':  '60m',
  '2h':  '60m',
  '3h':  '60m',
  '4h':  '60m',   // Yahoo max intraday = 60m
  '6h':  '60m',
  '12h': '60m',
  // Days
  '1D':  '1d',
  '2D':  '1d',
  '3D':  '1d',
  '4D':  '1d',
  // Weeks
  '1W':  '1wk',
  '2W':  '1wk',
  '3W':  '1wk',
  // Months
  '1M':  '1mo',
  '3M':  '3mo',
  '6M':  '3mo',
  '12M': '3mo',
}

const RANGE_MAP = {
  '1m':  '7d',
  '2m':  '7d',
  '3m':  '7d',
  '5m':  '7d',
  '10m': '7d',
  '15m': '7d',
  '30m': '60d',
  '45m': '60d',
  '1h':  '60d',
  '2h':  '60d',
  '3h':  '60d',
  '4h':  '60d',
  '6h':  '60d',
  '12h': '60d',
  '1D':  '2y',
  '2D':  '2y',
  '3D':  '2y',
  '4D':  '2y',
  '1W':  '5y',
  '2W':  '5y',
  '3W':  '5y',
  '1M':  '10y',
  '3M':  '10y',
  '6M':  '10y',
  '12M': '10y',
}

// ---------------------------------------------------------------------------
// Fetch OHLCV
// ---------------------------------------------------------------------------

/**
 * Returns [{timestamp(ms), open, high, low, close, volume}, ...]
 * @param {string} ticker   – e.g. 'AAPL'
 * @param {string} interval – app format e.g. '1D'
 */
export async function fetchStockOHLCV(ticker, interval) {
  const yahooInterval = INTERVAL_MAP[interval]
  if (!yahooInterval) throw new Error(`Unsupported interval: ${interval}`)

  const range = RANGE_MAP[interval]
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${yahooInterval}&range=${range}`

  const response = await proxyFetch(yahooUrl)
  if (!response.ok) throw new Error(`Proxy error: ${response.status}`)

  const data   = await response.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${ticker}`)

  const timestamps = result.timestamp ?? []
  const quote      = result.indicators?.quote?.[0] ?? {}
  const { open = [], high = [], low = [], close = [], volume = [] } = quote

  return timestamps
    .map((ts, i) => ({
      timestamp: ts * 1000,
      open:   open[i]   ?? null,
      high:   high[i]   ?? null,
      low:    low[i]    ?? null,
      close:  close[i]  ?? null,
      volume: volume[i] ?? null,
    }))
    .filter(c => c.open !== null && c.high !== null && c.low !== null && c.close !== null)
}

// ---------------------------------------------------------------------------
// Fetch single stock price (for watchlist)
// ---------------------------------------------------------------------------

/**
 * Returns { price: number, change: number (%) }
 */
export async function fetchStockPrice(ticker) {
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`

  const response = await proxyFetch(yahooUrl)
  if (!response.ok) throw new Error(`Proxy error: ${response.status}`)

  const data   = await response.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${ticker}`)

  const closes      = result.indicators?.quote?.[0]?.close ?? []
  const validCloses = closes.filter(c => c !== null && c !== undefined)

  if (validCloses.length < 2) {
    return { price: validCloses[validCloses.length - 1] ?? 0, change: 0 }
  }

  const price     = validCloses[validCloses.length - 1]
  const prevPrice = validCloses[validCloses.length - 2]
  const change    = ((price - prevPrice) / prevPrice) * 100

  return { price, change }
}

// ---------------------------------------------------------------------------
// Price feed — poll mỗi 60s, emit PRICES_UPDATE cho watchlist stocks
// ---------------------------------------------------------------------------

export function startStockPriceFeed() {
  const poll = async () => {
    try {
      const stocks = get('watchlist')?.stocks ?? []
      const currentSymbol = get('symbol')

      let stocksToFetch = [...stocks]
      // Nếu là stock (không có USDT) thì include vào
      if (currentSymbol && !currentSymbol.endsWith('USDT') && !stocksToFetch.includes(currentSymbol)) {
        stocksToFetch.push(currentSymbol)
      }

      if (stocksToFetch.length === 0) return;

      for (const ticker of stocksToFetch) {
        try {
          const { price, change } = await fetchStockPrice(ticker)
          // Emit update immediately for this single stock
          emit(EVENTS.PRICES_UPDATE, { [ticker]: { price, change } })
        } catch (err) {
          console.warn('[StockFeed]', ticker, err.message)
        }
        // Delay 300ms between requests to avoid proxy rate limits
        await new Promise(r => setTimeout(r, 300))
      }
    } catch (err) {
      console.error('[startStockPriceFeed]', err)
    }
  }

  poll()                          // fetch ngay lập tức
  on('state:watchlist', () => poll()) // fetch ngay khi watchlist thay đổi
  on(EVENTS.SYMBOL_CHANGE, () => poll()) // fetch ngay khi chuyển symbol
  return setInterval(poll, 60000) // rồi mỗi 60s
}
