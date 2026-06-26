// ---------------------------------------------------------------------------
// compareModal.js – Compare symbols modal UI module for the TradingView-clone app
// ---------------------------------------------------------------------------

import { on } from '../store/store.js'
import { EVENTS } from '../store/events.js'

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
    this._actionBtns  = document.querySelectorAll('.compare-action-btn')
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

    // Click on the backdrop (overlay itself, not the modal content)
    if (this._overlay) {
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) {
          this._close()
        }
      })
    }

    // All compare action buttons just close the modal
    if (this._actionBtns) {
      this._actionBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          this._close()
        })
      })
    }
  }

  // ── Open / Close ──────────────────────────────────────────────────────────

  /**
   * Open the compare modal.
   */
  _open() {
    if (this._overlay) {
      this._overlay.classList.add('open')
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
