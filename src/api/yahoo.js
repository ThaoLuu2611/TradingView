// ---------------------------------------------------------------------------
// yahoo.js – Stock OHLCV + price feed (Yahoo Finance via CORS proxy)
// ---------------------------------------------------------------------------
// Yahoo Finance blocks direct browser CORS requests.
// Solution: route through allorigins.win free CORS proxy (no key needed).
// ---------------------------------------------------------------------------

import { emit, get } from '../store/store.js'
import { EVENTS } from '../store/events.js'

// ---------------------------------------------------------------------------
// CORS proxy — đổi sang proxy khác nếu allorigins bị chặn
// ---------------------------------------------------------------------------
const PROXY = 'https://api.allorigins.win/raw?url='

function proxyUrl(url) {
  return PROXY + encodeURIComponent(url)
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

  const response = await fetch(proxyUrl(yahooUrl))
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

  const response = await fetch(proxyUrl(yahooUrl))
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
      if (stocks.length === 0) return

      const entries = await Promise.allSettled(
        stocks.map(async (ticker) => {
          const { price, change } = await fetchStockPrice(ticker)
          return [ticker, { price, change }]
        })
      )

      const prices = {}
      for (const entry of entries) {
        if (entry.status === 'fulfilled') {
          const [ticker, data] = entry.value
          prices[ticker] = data
        } else {
          console.warn('[StockFeed]', entry.reason?.message)
        }
      }

      if (Object.keys(prices).length > 0) {
        emit(EVENTS.PRICES_UPDATE, prices)
      }
    } catch (err) {
      console.error('[startStockPriceFeed]', err)
    }
  }

  poll()                          // fetch ngay lập tức
  return setInterval(poll, 60000) // rồi mỗi 60s
}
