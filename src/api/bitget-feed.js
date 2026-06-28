import { emit, get, on } from '../store/store.js'
import { EVENTS } from '../store/events.js'

const INTERVAL_MAP = {
  '1m':  '1m',
  '2m':  '1m',
  '3m':  '3m',
  '5m':  '5m',
  '10m': '5m',
  '15m': '15m',
  '30m': '30m',
  '45m': '30m',
  '1h':  '1H',
  '2h':  '1H',
  '3h':  '1H',
  '4h':  '4H',
  '6h':  '6H',
  '12h': '12H',
  '1D':  '1D',
  '2D':  '1D',
  '3D':  '1D',
  '4D':  '1D',
  '1W':  '1W',
  '2W':  '1W',
  '3W':  '1W',
  '1M':  '1M',
  '3M':  '1M',
  '6M':  '1M',
  '12M': '1M',
}

/**
 * Returns [{timestamp(ms), open, high, low, close, volume}, ...]
 * @param {string} ticker   – e.g. 'AAPL'
 * @param {string} interval – app format e.g. '1D'
 */
export async function fetchStockOHLCV(ticker, interval) {
  const bgInterval = INTERVAL_MAP[interval] || '1D'
  
  // Ensure ticker has USDT suffix for Bitget Futures
  const symbol = ticker.endsWith('USDT') ? ticker : ticker + 'USDT'
  
  const url = `https://api.bitget.com/api/v2/mix/market/candles?symbol=${symbol}&granularity=${bgInterval}&productType=USDT-FUTURES&limit=1000`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Bitget error: ${response.status}`)

  const json = await response.json()
  if (json.code !== '00000') throw new Error(`Bitget API Error: ${json.msg}`)

  const data = json.data || []
  
  // Bitget response format: [timestamp, open, high, low, close, baseVolume, quoteVolume]
  // timestamp is string ms e.g. "1774886400000"
  return data.map(c => ({
    timestamp: parseInt(c[0], 10),
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5])
  }))
}

// ---------------------------------------------------------------------------
// Price feed — poll mỗi 10s, emit PRICES_UPDATE cho watchlist stocks
// ---------------------------------------------------------------------------

export function startStockPriceFeed() {
  const poll = async () => {
    try {
      const stocks = get('watchlist')?.stocks ?? []
      const currentSymbol = get('symbol')

      let stocksToFetch = [...stocks]
      if (currentSymbol && !currentSymbol.endsWith('USDT') && !stocksToFetch.includes(currentSymbol)) {
        stocksToFetch.push(currentSymbol)
      }

      if (stocksToFetch.length === 0) return

      // Lấy toàn bộ ticker của thị trường USDT-M Futures trong 1 request
      const url = `https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES`
      const res = await fetch(url)
      const json = await res.json()
      
      if (json.code !== '00000') return
      
      const allTickers = json.data || []
      
      const prices = {}
      for (const ticker of stocksToFetch) {
        const symbolToFind = ticker.endsWith('USDT') ? ticker : ticker + 'USDT'
        const match = allTickers.find(t => t.symbol === symbolToFind)
        if (match) {
          prices[ticker] = {
            price: parseFloat(match.lastPr),
            change: parseFloat(match.change24h) * 100 // convert to percentage format used in app
          }
        }
      }

      if (Object.keys(prices).length > 0) {
        emit(EVENTS.PRICES_UPDATE, prices)
      }
    } catch (err) {
      console.error('[startStockPriceFeed]', err)
    }
  }

  poll()                          
  on('state:watchlist', () => poll()) 
  on(EVENTS.SYMBOL_CHANGE, () => poll()) 
  return setInterval(poll, 10000) // fetch mỗi 10s 
}
