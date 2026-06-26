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
  const ids = symbols
    .map((s) => SYMBOL_TO_ID[s])
    .filter(Boolean);

  if (ids.length === 0) return {};

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Convert from { bitcoin: { usd: 94250, usd_24h_change: 2.34 } }
  // to { BTCUSDT: { price: 94250, change: 2.34 } }
  const result = {};
  for (const [id, values] of Object.entries(data)) {
    const symbol = ID_TO_SYMBOL[id];
    if (symbol) {
      result[symbol] = {
        price: values.usd,
        change: values.usd_24h_change,
      };
    }
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
