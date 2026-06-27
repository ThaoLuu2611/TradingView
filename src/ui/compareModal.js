// ---------------------------------------------------------------------------
// compareModal.js – Compare symbols modal UI module for the TradingView-clone app
// ---------------------------------------------------------------------------

import { on } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { SYMBOL_LIST } from './searchBar.js'

export class CompareModal {
  constructor() {
    /** @type {HTMLElement}         */ this._overlay      = null
    /** @type {HTMLElement}         */ this._closeBtn     = null
    /** @type {HTMLElement}         */ this._compareList  = null
    /** @type {NodeListOf<Element>} */ this._actionBtns   = null
  }

  init() {
    this._bindDOM()
    this._subscribe()
    this._bindEvents()
  }

  // ── DOM references ────────────────────────────────────────────────────────

  _bindDOM() {
    this._overlay     = document.getElementById('compareOverlay')
    this._closeBtn    = document.getElementById('btn-compare-close')
    this._compareList = document.getElementById('compare-list')
    this._searchInput = document.getElementById('compare-search-input')
  }

  // ── Store subscriptions ───────────────────────────────────────────────────

  _subscribe() {
    on(EVENTS.COMPARE_OPEN, () => {
      this._open()
    })
  }

  // ── DOM event bindings ────────────────────────────────────────────────────

  _bindEvents() {
    // Close button
    if (this._closeBtn) {
      this._closeBtn.addEventListener('click', () => {
        this._close()
      })
    }

    // Click on the backdrop
    if (this._overlay) {
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) {
          this._close()
        }
      })
    }

    // Search input
    if (this._searchInput) {
      this._searchInput.addEventListener('input', () => {
        this._render(this._searchInput.value)
      })
    }

    // Action buttons (delegated)
    if (this._compareList) {
      this._compareList.addEventListener('click', (e) => {
        if (e.target.closest('.compare-action-btn')) {
          this._close()
        }
      })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _render(query = '') {
    if (!this._compareList) return
    const q = query.trim().toLowerCase()
    
    let results = SYMBOL_LIST
    if (q) {
      results = SYMBOL_LIST.filter(s => 
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      )
    }

    const getIcon = (sym, type) => {
      if (sym === 'BTCUSDT') return `<div class="compare-icon" style="background:#e3f2fd;color:#1565c0">&#8383;</div>`
      if (sym === 'ETHUSDT') return `<div class="compare-icon" style="background:#e8f5e9;color:#2e7d32">&Xi;</div>`
      if (type === 'crypto') return `<div class="compare-icon" style="background:#f3e5f5;color:#6a1b9a">${sym.charAt(0)}</div>`
      return `<div class="compare-icon" style="background:#e8eaf6;color:#283593">${sym.charAt(0)}</div>`
    }

    const getSource = (type) => {
      if (type === 'crypto') return `<b>Binance</b>spot`
      return `<b>NASDAQ</b>stock`
    }

    let html = `<div class="compare-section-label">${q ? 'SEARCH RESULTS' : 'RECENT SYMBOLS'}</div>`
    
    if (results.length === 0) {
      html += `<div style="padding: 20px; text-align: center; color: #787b86; font-size: 13px;">No symbols match your criteria</div>`
    } else {
      results.forEach(s => {
        html += `
          <div class="compare-row">
            ${getIcon(s.symbol, s.type)}
            <div class="compare-sym-info">
              <div class="compare-sym-name">${s.symbol}</div>
              <div class="compare-sym-desc">${s.name}</div>
            </div>
            <div class="compare-source">${getSource(s.type)}</div>
            <div class="compare-actions">
              <button class="compare-action-btn">Same % scale</button>
              <button class="compare-action-btn">New price scale</button>
              <button class="compare-action-btn">New pane</button>
            </div>
          </div>
        `
      })
    }

    this._compareList.innerHTML = html
  }

  // ── Open / Close ──────────────────────────────────────────────────────────

  /**
   * Open the compare modal.
   */
  _open() {
    if (this._overlay) {
      if (this._searchInput) {
        this._searchInput.value = ''
      }
      this._render()
      this._overlay.classList.add('open')
      
      // Focus the input
      setTimeout(() => {
        if (this._searchInput) this._searchInput.focus()
      }, 100)
    }
  }

  /**
   * Close the compare modal.
   */
  _close() {
    if (this._overlay) {
      this._overlay.classList.remove('open')
    }
  }
}
