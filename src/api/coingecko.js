import { emit, get } from '../store/store.js';
import { EVENTS } from '../store/events.js';

const SYMBOL_TO_ID = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  BNBUSDT: 'binancecoin',
  SOLUSDT: 'solana',
  XRPUSDT: 'ripple',
  ADAUSDT: 'cardano',
  DOGEUSDT: 'dogecoin',
  AVAXUSDT: 'avalanche-2',
  DOTUSDT: 'polkadot',
  MATICUSDT: 'matic-network',
  LTCUSDT: 'litecoin',
  LINKUSDT: 'chainlink',
  TONUSDT: 'the-open-network',
  NEARUSDT: 'near',
  APTUSDT: 'aptos',
};

// Reverse map: id → symbol
const ID_TO_SYMBOL = Object.fromEntries(
  Object.entries(SYMBOL_TO_ID).map(([symbol, id]) => [id, symbol]),
);

/**
 * Returns { BTCUSDT: {price: 94250, change: 2.34}, ... }
 * @param {string[]} symbols - array of app symbols e.g. ['BTCUSDT', 'ETHUSDT']
 */
export async function fetchPrices(symbols) {
  if (!symbols || symbols.length === 0) return {};

  const symbolsParam = JSON.stringify(symbols);
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const result = {};
  for (const item of data) {
    result[item.symbol] = {
      price: parseFloat(item.lastPrice),
      change: parseFloat(item.priceChangePercent),
    };
  }

  return result;
}

/**
 * Starts a price feed that polls CoinGecko every 30 seconds.
 * Emits EVENTS.PRICES_UPDATE with the latest prices for all crypto symbols.
 * @returns {number} interval ID (can be used with clearInterval)
 */
export function startCryptoPriceFeed() {
  const poll = async () => {
    try {
      const watchlist = get('watchlist');
      const cryptoSymbols = watchlist?.crypto ?? [];

      if (cryptoSymbols.length === 0) return;

      const prices = await fetchPrices(cryptoSymbols);
      emit(EVENTS.PRICES_UPDATE, prices);
    } catch (err) {
      console.error('[startCryptoPriceFeed] Error fetching crypto prices:', err);
    }
  };

  poll(); // Immediate first fetch
  return setInterval(poll, 30000);
}
