// ---------------------------------------------------------------------------
// leftPanel.js – Left panel: drawing tool buttons + submenus
// ---------------------------------------------------------------------------

import { on, emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'

// ---------------------------------------------------------------------------
// class TrendSubmenu
// ---------------------------------------------------------------------------

export class TrendSubmenu {
  constructor() {
    /** @type {HTMLElement} */
    this._menu = document.getElementById('trendMenu')
    this._bindEvents()
  }

  // ── Public ──────────────────────────────────────────────────────────────

  /** Toggle #trendMenu open, close #fibMenu */
  toggle() {
    const fibMenu = document.getElementById('fibMenu')
    if (fibMenu) fibMenu.classList.remove('open')
    this._menu.classList.toggle('open')
  }

  /**
   * Update .selected class on submenu items.
   * @param {string} subtool
   */
  setSelected(subtool) {
    this._menu.querySelectorAll('.lp-sub-item[data-subtool]').forEach((el) => {
      el.classList.toggle('selected', el.dataset.subtool === subtool)
    })
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _bindEvents() {
    this._menu.addEventListener('click', (e) => {
      const item = e.target.closest('.lp-sub-item[data-subtool]')
      if (!item) return
      const subtool = item.dataset.subtool
      emit(EVENTS.DRAWING_TOOL, subtool)
      this.setSelected(subtool)
      this._menu.classList.remove('open')
    })
  }
}

// ---------------------------------------------------------------------------
// class FibSubmenu
// ---------------------------------------------------------------------------

export class FibSubmenu {
  constructor() {
    /** @type {HTMLElement} */
    this._menu = document.getElementById('fibMenu')
    this._bindEvents()
  }

  // ── Public ──────────────────────────────────────────────────────────────

  /** Toggle #fibMenu open, close #trendMenu */
  toggle() {
    const trendMenu = document.getElementById('trendMenu')
    if (trendMenu) trendMenu.classList.remove('open')
    this._menu.classList.toggle('open')
  }

  /**
   * Update .selected class on submenu items.
   * @param {string} subtool
   */
  setSelected(subtool) {
    this._menu.querySelectorAll('.lp-sub-item[data-subtool]').forEach((el) => {
      el.classList.toggle('selected', el.dataset.subtool === subtool)
    })
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _bindEvents() {
    this._menu.addEventListener('click', (e) => {
      const item = e.target.closest('.lp-sub-item[data-subtool]')
      if (!item) return
      const subtool = item.dataset.subtool
      emit(EVENTS.DRAWING_TOOL, subtool)
      this.setSelected(subtool)
      this._menu.classList.remove('open')
    })
  }
}

// ---------------------------------------------------------------------------
// class LeftPanel
// ---------------------------------------------------------------------------

export class LeftPanel {
  constructor() {
    this.trendSub = null
    this.fibSub   = null
  }

  init() {
    this.trendSub = new TrendSubmenu()
    this.fibSub   = new FibSubmenu()
    this._bindDOM()
    this._bindEvents()
    this._subscribe()
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _bindDOM() {
    this._btnTrendline = document.getElementById('btn-trendline')
    this._btnFib       = document.getElementById('btn-fib')
    this._btnClear     = document.getElementById('btn-clear')
    this._panel        = document.getElementById('left-panel')
  }

  _bindEvents() {
    this._btnTrendlineArrow = document.getElementById('btn-trendline-arrow')
    this._btnFibArrow       = document.getElementById('btn-fib-arrow')

    // Trendline main button (activate default)
    if (this._btnTrendline) {
      this._btnTrendline.addEventListener('click', (e) => {
        e.stopPropagation()
        document.getElementById('fibMenu')?.classList.remove('open')
        this._setToolActive(this._btnTrendline)
        const selected = document.querySelector('#trendMenu .lp-sub-item.selected')
        if (selected) emit(EVENTS.DRAWING_TOOL, selected.dataset.subtool)
      })
    }

    // Trendline arrow (open submenu)
    if (this._btnTrendlineArrow) {
      this._btnTrendlineArrow.addEventListener('click', (e) => {
        e.stopPropagation()
        this.trendSub.toggle()
      })
    }

    // Fib main button (activate default)
    if (this._btnFib) {
      this._btnFib.addEventListener('click', (e) => {
        e.stopPropagation()
        document.getElementById('trendMenu')?.classList.remove('open')
        this._setToolActive(this._btnFib)
        const selected = document.querySelector('#fibMenu .lp-sub-item.selected')
        if (selected) emit(EVENTS.DRAWING_TOOL, selected.dataset.subtool)
      })
    }

    // Fib arrow (open submenu)
    if (this._btnFibArrow) {
      this._btnFibArrow.addEventListener('click', (e) => {
        e.stopPropagation()
        this.fibSub.toggle()
      })
    }

    // Clear button
    if (this._btnClear) {
      this._btnClear.addEventListener('click', () => {
        emit(EVENTS.DRAWING_CLEAR)
      })
    }

    // Document click → close both submenus if click outside #left-panel
    document.addEventListener('click', (e) => {
      if (this._panel && !this._panel.contains(e.target)) {
        document.getElementById('trendMenu')?.classList.remove('open')
        document.getElementById('fibMenu')?.classList.remove('open')
      }
    })
  }

  _subscribe() {
    on(EVENTS.DRAWING_TOOL, (subtool) => {
      // Map subtool → parent button and highlight it
      const fibSubtools = [
        'fibonacciRetracement', 
        'fibonacciExtension', 
        'fibonacciChannel', 
        'fibonacciSpeedResistanceFan'
      ]
      if (fibSubtools.includes(subtool)) {
        if (this._btnFib) this._setToolActive(this._btnFib)
      } else {
        if (this._btnTrendline) this._setToolActive(this._btnTrendline)
      }
    })
  }

  /**
   * Remove .active from all .lp-btn elements, then add to the given button.
   * @param {HTMLElement} activeBtn
   */
  _setToolActive(activeBtn) {
    document.querySelectorAll('.lp-btn').forEach((btn) => {
      btn.classList.remove('active')
    })
    if (activeBtn) activeBtn.classList.add('active')
  }
}
