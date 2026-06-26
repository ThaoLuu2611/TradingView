// ---------------------------------------------------------------------------
// watchlist.js – Watchlist UI module for the TradingView-clone app
// ---------------------------------------------------------------------------

import { get, set, on, emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { formatPrice, formatPercent } from '../utils/format.js'

export class Watchlist {
  constructor() {
    /** @type {HTMLElement}       */ this._list = null
    /** @type {NodeListOf<Element>} */ this._tabs = null
  }

  init() {
    this._bindDOM()
    this._renderList()
    this._bindEvents()
    this._subscribe()
    // Highlight the initially active symbol
    this._highlightSelected(get('symbol'))
  }

  // ── DOM references ────────────────────────────────────────────────────────

  _bindDOM() {
    this._list = document.getElementById('wl-list')
    this._tabs = document.querySelectorAll('.wl-tab')
  }

  // ── DOM event bindings ────────────────────────────────────────────────────

  _bindEvents() {
    // Tab clicks
    this._tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabKey = tab.dataset.tab // expects data-tab="crypto" or "stocks"
        if (!tabKey) return

        // Update active tab styling
        this._tabs.forEach((t) => t.classList.remove('active'))
        tab.classList.add('active')

        // Persist to store and re-render
        set('activeTab', tabKey)
        this._renderList()
        this._highlightSelected(get('symbol'))
      })
    })

    // Row clicks – delegated on the list container
    if (this._list) {
      this._list.addEventListener('click', (e) => {
        const row = e.target.closest('.wl-row')
        if (!row) return
        const symbol = row.dataset.symbol
        if (symbol) {
          emit(EVENTS.SYMBOL_CHANGE, symbol)
        }
      })
    }
  }

  // ── Store subscriptions ───────────────────────────────────────────────────

  _subscribe() {
    on(EVENTS.SYMBOL_CHANGE, (symbol) => {
      this._highlightSelected(symbol)
    })

    on(EVENTS.PRICES_UPDATE, (data) => {
      if (!data) return
      for (const [symbol, entry] of Object.entries(data)) {
        const priceEl = document.getElementById(`price-${symbol}`)
        const chgEl   = document.getElementById(`chg-${symbol}`)

        if (priceEl) {
          priceEl.textContent = formatPrice(entry.price)
        }

        if (chgEl) {
          const pct = entry.change
          chgEl.textContent = formatPercent(pct)
          chgEl.classList.remove('up', 'dn')
          chgEl.classList.add(pct >= 0 ? 'up' : 'dn')
        }
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  /**
   * Build and inject watchlist rows for the active tab.
   */
  _renderList() {
    if (!this._list) return

    const activeTab = get('activeTab')           // 'crypto' | 'stocks'
    const watchlist = get('watchlist')           // { crypto: [...], stocks: [...] }
    const symbols   = watchlist[activeTab] ?? []

    this._list.innerHTML = symbols.map((symbol) => {
      const displayName = activeTab === 'crypto'
        ? symbol.replace(/USDT$/i, '')
        : symbol

      return `
        <div class="wl-row" data-symbol="${symbol}">
          <span class="wl-sym">${displayName}</span>
          <div class="wl-right">
            <div class="wl-price" id="price-${symbol}">—</div>
            <div class="wl-chg"  id="chg-${symbol}"></div>
          </div>
        </div>`
    }).join('')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Add .selected to the matching row and remove it from others.
   * @param {string} symbol
   */
  _highlightSelected(symbol) {
    if (!this._list) return
    this._list.querySelectorAll('.wl-row').forEach((row) => {
      row.classList.toggle('selected', row.dataset.symbol === symbol)
    })
  }
}
