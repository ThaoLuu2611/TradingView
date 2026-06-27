// ---------------------------------------------------------------------------
// addSymbolModal.js – "Add symbol" modal for the watchlist
// ---------------------------------------------------------------------------

import { get, set, on, forceSave } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { SYMBOL_LIST, fetchAllBinanceSymbols } from './searchBar.js'

export class AddSymbolModal {
  constructor() {
    this._overlay  = null
    this._input    = null
    this._list     = null
    this._tabs     = null
    this._activeFilter = 'all' // 'all' | 'crypto' | 'stock'
  }

  init() {
    this._bindDOM()
    this._bindEvents()

    // Re-render list when watchlist changes (to update +/- buttons)
    on('state:watchlist', () => this._renderList())
  }

  // ── DOM ──────────────────────────────────────────────────────────────────

  _bindDOM() {
    this._overlay = document.getElementById('addSymOverlay')
    this._input   = document.getElementById('add-sym-input')
    this._list    = document.getElementById('add-sym-list')
    this._tabs    = document.querySelectorAll('.add-sym-tab')
  }

  // ── Events ───────────────────────────────────────────────────────────────

  _bindEvents() {
    // Open via custom event (triggered by watchlist btn)
    document.addEventListener('open-add-symbol-modal', () => this.open())

    // Close button
    document.getElementById('btn-add-sym-close')
      ?.addEventListener('click', () => this.close())

    // Click outside to close
    this._overlay?.addEventListener('pointerdown', (e) => {
      if (e.target === this._overlay) this.close()
    })

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._overlay?.classList.contains('open')) {
        this.close()
      }
    })

    // Search input
    this._input?.addEventListener('input', () => this._renderList())

    // Tab filter
    this._tabs?.forEach(tab => {
      tab.addEventListener('click', () => {
        this._tabs.forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        this._activeFilter = tab.dataset.filter
        this._renderList()
      })
    })

    // Delegated click on +/- buttons
    this._list?.addEventListener('click', (e) => {
      const btn = e.target.closest('.asm-action-btn')
      if (!btn) return
      const symbol = btn.closest('.asm-row')?.dataset.symbol
      const type   = btn.closest('.asm-row')?.dataset.type
      if (!symbol) return

      const wl = get('watchlist') || { crypto: [], stocks: [] }
      const listKey = type === 'crypto' ? 'crypto' : 'stocks'
      const isIn = wl[listKey]?.includes(symbol)

      if (isIn) {
        wl[listKey] = wl[listKey].filter(s => s !== symbol)
      } else {
        wl[listKey] = [symbol, ...(wl[listKey] || [])]
      }

      set('watchlist', wl)
      forceSave()
      // Re-render to flip +/- icon
      this._renderList()
    })
  }

  // ── Open / Close ─────────────────────────────────────────────────────────

  open() {
    fetchAllBinanceSymbols().then(() => this._renderList())
    this._overlay?.classList.add('open')
    setTimeout(() => this._input?.focus(), 50)
    this._renderList()
  }

  close() {
    this._overlay?.classList.remove('open')
    if (this._input) this._input.value = ''
    this._activeFilter = 'all'
    this._tabs?.forEach(t => t.classList.remove('active'))
    this._tabs?.[0]?.classList.add('active')
  }

  // ── Render ───────────────────────────────────────────────────────────────

  _renderList() {
    if (!this._list) return
    const q  = (this._input?.value ?? '').trim().toLowerCase()
    const wl = get('watchlist') || { crypto: [], stocks: [] }

    let items = SYMBOL_LIST

    // Filter by tab
    if (this._activeFilter === 'crypto') {
      items = items.filter(i => i.type === 'crypto')
    } else if (this._activeFilter === 'stock') {
      items = items.filter(i => i.type === 'stock')
    }

    // Filter by search query
    if (q) {
      items = items.filter(i =>
        i.symbol.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q)
      )
    }

    // Limit to 80 for perf
    items = items.slice(0, 80)

    if (items.length === 0) {
      this._list.innerHTML = `<div class="asm-empty">No results found</div>`
      return
    }

    this._list.innerHTML = items.map(item => {
      const listKey = item.type === 'crypto' ? 'crypto' : 'stocks'
      const isIn    = wl[listKey]?.includes(item.symbol)
      const badgeCls = item.type === 'crypto' ? 'badge-crypto' : 'badge-stock'
      const badgeTxt = item.type === 'crypto' ? 'CRYPTO' : 'STOCK'
      const btnCls   = isIn ? 'asm-action-btn in-wl' : 'asm-action-btn'
      const btnTitle = isIn ? 'Remove from Watchlist' : 'Add to Watchlist'
      const icon     = isIn
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`

      return `
        <div class="asm-row" data-symbol="${item.symbol}" data-type="${item.type}">
          <div class="asm-left">
            <span class="asm-sym">${item.symbol}</span>
            <span class="asm-name">${item.name}</span>
          </div>
          <div class="asm-right">
            <span class="search-badge ${badgeCls}">${badgeTxt}</span>
            <button class="${btnCls}" title="${btnTitle}">${icon}</button>
          </div>
        </div>`
    }).join('')
  }
}
