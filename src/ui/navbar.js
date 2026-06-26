// ---------------------------------------------------------------------------
// navbar.js – Navbar UI module for the TradingView-clone app
// ---------------------------------------------------------------------------

import { on, emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { get } from '../store/store.js'
import { formatPrice, formatPercent } from '../utils/format.js'

export class Navbar {
  constructor() {
    /** @type {HTMLElement} */ this._symName    = null
    /** @type {HTMLElement} */ this._symPrice   = null
    /** @type {HTMLElement} */ this._symChange  = null
    /** @type {HTMLElement} */ this._spinner    = null
    /** @type {HTMLElement} */ this._toast      = null

    this._toastTimer = null
  }

  init() {
    this._bindDOM()
    this._bindEvents()
    this._subscribe()
  }

  // ── DOM references ────────────────────────────────────────────────────────

  _bindDOM() {
    this._symName   = document.getElementById('sym-name')
    this._symPrice  = document.getElementById('sym-price')
    this._symChange = document.getElementById('sym-change')
    this._spinner   = document.getElementById('nav-spinner')
    this._toast     = document.getElementById('toast')
  }

  // ── DOM event bindings ────────────────────────────────────────────────────

  _bindEvents() {
    const btnCompare = document.getElementById('btn-compare')
    if (btnCompare) {
      btnCompare.addEventListener('click', () => {
        emit(EVENTS.COMPARE_OPEN)
      })
    }

    // #btn-sym-type intentionally does nothing
    // (placeholder for future symbol-type info panel)
  }

  // ── Store subscriptions ───────────────────────────────────────────────────

  _subscribe() {
    on(EVENTS.SYMBOL_CHANGE, (symbol) => {
      if (this._symName)  this._symName.textContent  = symbol
      if (this._symPrice) this._symPrice.textContent = '—'
    })

    on(EVENTS.PRICES_UPDATE, (data) => {
      const symbol = get('symbol')
      if (!data || !symbol) return

      const entry = data[symbol]
      if (!entry) return

      const { price, change } = entry

      if (this._symPrice) {
        this._symPrice.textContent = formatPrice(price)
      }

      if (this._symChange) {
        this._symChange.textContent = formatPercent(change)
        this._symChange.classList.remove('up', 'dn')
        this._symChange.classList.add(change >= 0 ? 'up' : 'dn')
      }
    })

    on(EVENTS.LOADING, (v) => {
      if (this._spinner) {
        this._spinner.classList.toggle('show', Boolean(v))
      }
    })

    on(EVENTS.ERROR, (msg) => {
      this._showToast(msg)
    })
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Display a toast notification for 3 seconds.
   * @param {string} msg
   */
  _showToast(msg) {
    if (!this._toast) return

    // Clear any existing timer so multiple errors don't race
    if (this._toastTimer !== null) {
      clearTimeout(this._toastTimer)
      this._toastTimer = null
    }

    this._toast.textContent = msg
    this._toast.classList.add('show')

    this._toastTimer = setTimeout(() => {
      this._toast.classList.remove('show')
      this._toastTimer = null
    }, 3000)
  }
}
