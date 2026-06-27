// ---------------------------------------------------------------------------
// watchlist.js – Watchlist UI module for the TradingView-clone app
// ---------------------------------------------------------------------------

import { get, set, on, emit, forceSave } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { formatPrice, formatPercent } from '../utils/format.js'

export class Watchlist {
  constructor() {
    /** @type {HTMLElement}       */ this._list = null
    /** @type {NodeListOf<Element>} */ this._tabs = null
    /** @type {Object}            */ this._cachedPrices = {}
  }

  init() {
    this._bindDOM()
    this._renderList()
    this._bindEvents()
    this._subscribe()
    // Highlight the initially active symbol
    const currentSymbol = get('symbol')
    this._highlightSelected(currentSymbol)
  }

  // ── DOM references ────────────────────────────────────────────────────────

  _bindDOM() {
    this._list = document.getElementById('wl-list')
    this._tabs = document.querySelectorAll('.wl-tab')
    this._btnAddWl = document.getElementById('btn-add-to-wl')
  }

  // ── DOM event bindings ────────────────────────────────────────────────────

  _bindEvents() {
    if (this._btnAddWl) {
      this._btnAddWl.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('open-add-symbol-modal'))
      })
    }

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
        this._applyPrices()
        this._highlightSelected(get('symbol'))
      })
    })

    // Row clicks – delegated on the list container
    if (this._list) {
      this._list.addEventListener('click', (e) => {
        const row = e.target.closest('.wl-row')
        if (!row) return
        const symbol = row.dataset.symbol
        if (!symbol) return

        // Handle delete button
        if (e.target.closest('.wl-del-btn')) {
          e.stopPropagation()
          const activeTab = get('activeTab')
          const wl = get('watchlist')
          if (wl && wl[activeTab]) {
            wl[activeTab] = wl[activeTab].filter(s => s !== symbol)
            set('watchlist', wl)
            forceSave()
          }
          return
        }

        // Normal row click -> change symbol
        emit(EVENTS.SYMBOL_CHANGE, symbol)
      })
    }
  }

  // ── Store subscriptions ───────────────────────────────────────────────────

  _subscribe() {
    on('state:watchlist', () => {
      this._renderList()
      this._applyPrices()
      this._highlightSelected(get('symbol'))
    })

    on(EVENTS.SYMBOL_CHANGE, (symbol) => {
      this._highlightSelected(symbol)
    })

    on(EVENTS.PRICES_UPDATE, (data) => {
      if (!data) return
      // Cache giá mới nhận được
      Object.assign(this._cachedPrices, data)
      // Cập nhật DOM
      for (const [symbol, entry] of Object.entries(data)) {
        const priceEl = document.getElementById(`price-${symbol}`)
        const chgEl   = document.getElementById(`chg-${symbol}`)
        if (priceEl) priceEl.textContent = formatPrice(entry.price)
        if (chgEl) {
          const pct = entry.change
          chgEl.textContent = formatPercent(pct)
          chgEl.classList.remove('up', 'dn')
          chgEl.classList.add(pct >= 0 ? 'up' : 'dn')
        }
      }
    })

    on(EVENTS.WATCHLIST_ADD, (symbol) => {
      const wl = get('watchlist')
      if (wl) {
        // Find if it's crypto or stock (we'll assume crypto for simplicity if added from compare)
        const isStock = !symbol.endsWith('USDT') && symbol.length <= 5
        const listName = isStock ? 'stocks' : 'crypto'
        if (!wl[listName].includes(symbol)) {
          wl[listName].unshift(symbol)
          set('watchlist', wl)
          set('activeTab', listName)
          // update tabs
          this._tabs.forEach((t) => t.classList.remove('active'))
          const targetTab = Array.from(this._tabs).find(t => t.dataset.tab === listName)
          if (targetTab) targetTab.classList.add('active')
          
          forceSave()
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
            <div class="wl-price-col">
              <div class="wl-price" id="price-${symbol}">—</div>
              <div class="wl-chg"  id="chg-${symbol}"></div>
            </div>
            <div class="wl-del-btn" title="Remove from Watchlist">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
            </div>
          </div>
        </div>`
    }).join('')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Fill giá từ cache sau khi re-render list */
  _applyPrices() {
    for (const [symbol, entry] of Object.entries(this._cachedPrices)) {
      const priceEl = document.getElementById(`price-${symbol}`)
      const chgEl   = document.getElementById(`chg-${symbol}`)
      if (priceEl) priceEl.textContent = formatPrice(entry.price)
      if (chgEl) {
        const pct = entry.change
        chgEl.textContent = formatPercent(pct)
        chgEl.classList.remove('up', 'dn')
        chgEl.classList.add(pct >= 0 ? 'up' : 'dn')
      }
    }
  }

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
