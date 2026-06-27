// ---------------------------------------------------------------------------
// searchBar.js – Search bar UI module for the TradingView-clone app
// ---------------------------------------------------------------------------

import { emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'

// ---------------------------------------------------------------------------
// Symbol catalogue – 25 symbols with type and display name
// ---------------------------------------------------------------------------

/** @type {Array<{symbol: string, name: string, type: 'crypto'|'stock'}>} */
export const SYMBOL_LIST = [
  // Crypto (15)
  { symbol: 'BTCUSDT',   name: 'Bitcoin',          type: 'crypto' },
  { symbol: 'ETHUSDT',   name: 'Ethereum',          type: 'crypto' },
  { symbol: 'BNBUSDT',   name: 'BNB',               type: 'crypto' },
  { symbol: 'SOLUSDT',   name: 'Solana',             type: 'crypto' },
  { symbol: 'XRPUSDT',   name: 'XRP',               type: 'crypto' },
  { symbol: 'ADAUSDT',   name: 'Cardano',            type: 'crypto' },
  { symbol: 'DOGEUSDT',  name: 'Dogecoin',           type: 'crypto' },
  { symbol: 'AVAXUSDT',  name: 'Avalanche',          type: 'crypto' },
  { symbol: 'DOTUSDT',   name: 'Polkadot',           type: 'crypto' },
  { symbol: 'MATICUSDT', name: 'Polygon',            type: 'crypto' },
  { symbol: 'LTCUSDT',   name: 'Litecoin',           type: 'crypto' },
  { symbol: 'LINKUSDT',  name: 'Chainlink',          type: 'crypto' },
  { symbol: 'TONUSDT',   name: 'Toncoin',            type: 'crypto' },
  { symbol: 'NEARUSDT',  name: 'NEAR Protocol',      type: 'crypto' },
  { symbol: 'APTUSDT',   name: 'Aptos',              type: 'crypto' },
  // Stocks (10)
  { symbol: 'AAPL',  name: 'Apple Inc.',          type: 'stock' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',     type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',       type: 'stock' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',     type: 'stock' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',  type: 'stock' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',          type: 'stock' },
  { symbol: 'META',  name: 'Meta Platforms',      type: 'stock' },
  { symbol: 'NFLX',  name: 'Netflix Inc.',        type: 'stock' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices', type: 'stock' },
  { symbol: 'INTC',  name: 'Intel Corporation',   type: 'stock' },
]

let isSymbolsFetched = false

export async function fetchAllBinanceSymbols() {
  if (isSymbolsFetched) return
  try {
    const res = await fetch('https://api.binance.com/api/v3/exchangeInfo')
    const data = await res.json()
    const fetchedSymbols = data.symbols
      .filter(s => s.status === 'TRADING')
      .map(s => ({
        symbol: s.symbol,
        name: s.baseAsset + ' / ' + s.quoteAsset,
        type: 'crypto'
      }))
    
    const existing = new Set(SYMBOL_LIST.map(s => s.symbol))
    for (const s of fetchedSymbols) {
      if (!existing.has(s.symbol)) {
        SYMBOL_LIST.push(s)
      }
    }
    isSymbolsFetched = true
  } catch (err) {
    console.error('Failed to fetch binance symbols', err)
  }
}

// ---------------------------------------------------------------------------

export class SearchBar {
  constructor() {
    /** @type {HTMLInputElement} */ this._input     = null
    /** @type {HTMLElement}      */ this._drop       = null
    /** @type {HTMLElement}      */ this._searchBox  = null
  }

  init() {
    this._bindDOM()
    this._bindEvents()
    this._subscribe()
    fetchAllBinanceSymbols()
  }

  // ── DOM references ────────────────────────────────────────────────────────

  _bindDOM() {
    this._input     = document.getElementById('search-input')
    this._drop      = document.getElementById('searchDrop')
    this._searchBox = document.getElementById('search-box')
  }

  // ── DOM event bindings ────────────────────────────────────────────────────

  _bindEvents() {
    if (!this._input || !this._drop || !this._searchBox) return

    // Input – filter on every keystroke
    this._input.addEventListener('input', () => {
      const q = this._input.value.trim()
      const results = q.length === 0 ? SYMBOL_LIST : this._filter(q)
      this._renderDrop(results)
      this._openDrop()
    })

    // Focus – show all when empty, otherwise filter
    this._input.addEventListener('focus', () => {
      const q = this._input.value.trim()
      const results = q.length === 0 ? SYMBOL_LIST : this._filter(q)
      this._renderDrop(results)
      this._openDrop()
    })

    // Delegated click on dropdown items
    this._drop.addEventListener('click', (e) => {
      const row = e.target.closest('.search-drop-item')
      if (!row) return

      const symbol = row.dataset.symbol
      if (!symbol) return

      // If clicked on Add to Watchlist button
      if (e.target.closest('.search-add-wl')) {
        import('../store/store.js').then(({ emit }) => {
          emit(EVENTS.WATCHLIST_ADD, symbol)
        })
        const toast = document.getElementById('toast')
        if (toast) {
          toast.textContent = `Added ${symbol} to Watchlist`
          toast.className = 'toast show'
          setTimeout(() => toast.className = 'toast', 2000)
        }
        return // don't close drop or change symbol
      }

      // Normal click -> change symbol
      import('../store/store.js').then(({ emit }) => {
        emit(EVENTS.SYMBOL_CHANGE, symbol)
      })
      this._input.value = ''
      this._closeDrop()
    })

    // Close when clicking outside the search-box
    document.addEventListener('pointerdown', (e) => {
      if (!this._searchBox.contains(e.target)) {
        this._closeDrop()
      }
    }, true)
  }

  // ── Store subscriptions ───────────────────────────────────────────────────

  _subscribe() {
    // No store subscriptions needed for the search bar
  }

  // ── Render ────────────────────────────────────────────────────────────────

  /**
   * Group items by type and render section headers + rows into the dropdown.
   * @param {Array<{symbol: string, name: string, type: string}>} items
   */
  _renderDrop(items) {
    if (!this._drop) return

    if (items.length === 0) {
      this._drop.innerHTML = `
        <div class="search-drop-item" style="color:#787b86;cursor:default;justify-content:center;">
          No results found
        </div>`
      return
    }

    const cryptoItems = items.filter((i) => i.type === 'crypto')
    const stockItems  = items.filter((i) => i.type === 'stock')

    let html = ''

    if (cryptoItems.length > 0) {
      html += `<div class="search-section">Crypto</div>`
      html += cryptoItems.map((item) => this._renderItem(item)).join('')
    }

    if (stockItems.length > 0) {
      html += `<div class="search-section">Stocks</div>`
      html += stockItems.map((item) => this._renderItem(item)).join('')
    }

    this._drop.innerHTML = html
  }

  /**
   * Render a single dropdown row.
   * @param {{symbol: string, name: string, type: string}} item
   * @returns {string}
   */
  _renderItem(item) {
    const badgeClass = item.type === 'crypto' ? 'badge-crypto' : 'badge-stock'
    const badgeLabel = item.type === 'crypto' ? 'CRYPTO' : 'STOCK'

    return `
      <div class="search-drop-item" data-symbol="${item.symbol}">
        <span class="sd-sym">${item.symbol}</span>
        <span class="sd-name">${item.name}</span>
        <span class="search-badge ${badgeClass}">${badgeLabel}</span>
        <div class="compare-add-wl search-add-wl" title="Add to Watchlist">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      </div>`
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Filter SYMBOL_LIST by query against symbol or display name (case-insensitive).
   * @param {string} query
   * @returns {Array<{symbol: string, name: string, type: string}>}
   */
  _filter(query) {
    const q = query.toLowerCase()
    return SYMBOL_LIST.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    ).slice(0, 100) // Limit to 100 results to avoid lag
  }

  _openDrop() {
    if (this._drop) this._drop.classList.add('open')
  }

  _closeDrop() {
    if (this._drop) this._drop.classList.remove('open')
  }
}
