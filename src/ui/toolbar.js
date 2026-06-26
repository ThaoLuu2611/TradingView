// ---------------------------------------------------------------------------
// toolbar.js – Timeframe dropdown + Toolbar shortcut buttons
// ---------------------------------------------------------------------------

import { get, set, on, emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'

// ---------------------------------------------------------------------------
// Timeframe data
// ---------------------------------------------------------------------------

/** All timeframe sections and their items: { label, tf, pinnable } */
const TF_SECTIONS = [
  {
    title: 'TICKS',
    items: [
      { label: '1 tick',    tf: '1t',    pinnable: false },
      { label: '10 ticks',  tf: '10t',   pinnable: false },
      { label: '100 ticks', tf: '100t',  pinnable: false },
      { label: '1000 ticks',tf: '1000t', pinnable: false },
    ],
  },
  {
    title: 'SECONDS',
    items: [
      { label: '1 second',  tf: '1s',  pinnable: false },
      { label: '5 seconds', tf: '5s',  pinnable: false },
      { label: '10 seconds',tf: '10s', pinnable: false },
      { label: '15 seconds',tf: '15s', pinnable: false },
      { label: '30 seconds',tf: '30s', pinnable: false },
      { label: '45 seconds',tf: '45s', pinnable: false },
    ],
  },
  {
    title: 'MINUTES',
    items: [
      { label: '1 minute',  tf: '1m',  pinnable: true  },
      { label: '2 minutes', tf: '2m',  pinnable: false },
      { label: '3 minutes', tf: '3m',  pinnable: false },
      { label: '5 minutes', tf: '5m',  pinnable: true  },
      { label: '10 minutes',tf: '10m', pinnable: false },
      { label: '15 minutes',tf: '15m', pinnable: true  },
      { label: '30 minutes',tf: '30m', pinnable: false },
      { label: '45 minutes',tf: '45m', pinnable: false },
    ],
  },
  {
    title: 'HOURS',
    items: [
      { label: '1 hour',  tf: '1h',  pinnable: true  },
      { label: '2 hours', tf: '2h',  pinnable: false },
      { label: '3 hours', tf: '3h',  pinnable: false },
      { label: '4 hours', tf: '4h',  pinnable: true  },
      { label: '6 hours', tf: '6h',  pinnable: false },
      { label: '12 hours',tf: '12h', pinnable: false },
    ],
  },
  {
    title: 'DAYS',
    items: [
      { label: '1 day',  tf: '1D', pinnable: true  },
      { label: '2 days', tf: '2D', pinnable: false },
      { label: '3 days', tf: '3D', pinnable: false },
      { label: '4 days', tf: '4D', pinnable: false },
    ],
  },
  {
    title: 'WEEKS',
    items: [
      { label: '1 week',  tf: '1W', pinnable: true  },
      { label: '2 weeks', tf: '2W', pinnable: false },
      { label: '3 weeks', tf: '3W', pinnable: false },
    ],
  },
  {
    title: 'MONTHS',
    items: [
      { label: '1 month',  tf: '1M',  pinnable: false },
      { label: '3 months', tf: '3M',  pinnable: false },
      { label: '6 months', tf: '6M',  pinnable: false },
      { label: '12 months',tf: '12M', pinnable: false },
    ],
  },
]

// ---------------------------------------------------------------------------
// Valid API intervals (timeframes that can actually be requested)
// ---------------------------------------------------------------------------
const VALID_INTERVALS = new Set(['1m','5m','15m','30m','1h','4h','1D','1W'])

// ---------------------------------------------------------------------------
// class TimeframeDrop
// ---------------------------------------------------------------------------

export class TimeframeDrop {
  constructor() {
    /** @type {HTMLElement} */
    this._drop = document.getElementById('tfDrop')
    this._render()
    this._bindEvents()
  }

  // ── Public ──────────────────────────────────────────────────────────────

  /** Toggle the open class on #tfDrop */
  toggle() {
    this._drop.classList.toggle('open')
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _render() {
    const pinned = get('pinnedTimeframes') || []
    const currentTf = get('timeframe')

    let html = `<div class="tf-drop-add">&#43; Add custom interval...</div>`

    TF_SECTIONS.forEach((section, idx) => {
      if (idx > 0) {
        html += `<div class="tf-divider"></div>`
      }

      html += `
        <div class="tf-drop-section">
          ${section.title}
          <span>&#8963;</span>
        </div>`

      section.items.forEach(({ label, tf }) => {
        const isActive  = tf === currentTf
        const isPinned  = pinned.includes(tf)
        // ALL timeframes show a star — grey if not pinned, gold if pinned
        const starClass = isPinned ? 'tf-star on' : 'tf-star'
        const starHtml  = `<span class="${starClass}" data-tf="${tf}" title="${isPinned ? 'Unpin' : 'Pin to toolbar'}">&#9733;</span>`

        html += `
          <div class="tf-drop-item${isActive ? ' active' : ''}" data-tf="${tf}" data-valid="${VALID_INTERVALS.has(tf)}">
            <span>${label}</span>
            ${starHtml}
          </div>`
      })
    })

    this._drop.innerHTML = html
  }

  _bindEvents() {
    // Star click → pin toggle
    this._drop.addEventListener('click', (e) => {
      const star = e.target.closest('.tf-star')
      if (star) {
        e.stopPropagation()
        const tf = star.dataset.tf
        emit(EVENTS.TF_PIN_TOGGLE, tf)
        return
      }

      // Item click → change timeframe if it's a valid interval
      const item = e.target.closest('.tf-drop-item')
      if (item) {
        const tf    = item.dataset.tf
        const valid = item.dataset.valid === 'true'
        if (valid) {
          emit(EVENTS.TIMEFRAME_CHANGE, tf)
        }
        this._drop.classList.remove('open')
      }
    })

    // Document click → close if not inside .tf-dropdown-wrap
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tf-dropdown-wrap')) {
        this._drop.classList.remove('open')
      }
    })
  }
}

// ---------------------------------------------------------------------------
// class Toolbar
// ---------------------------------------------------------------------------

export class Toolbar {
  constructor() {
    this.tfDrop = null
    this._tfButtons = null
    this._btnTfMore = null
    this._tfDrop = null
    this._btnCandle = null
    this._candleDrop = null
    this._btnIndicators = null
  }

  init() {
    this.tfDrop = new TimeframeDrop()
    this._bindDOM()
    this._bindEvents()
    this._subscribe()
    this._renderTfButtons()
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _bindDOM() {
    this._tfButtons   = document.getElementById('tf-buttons')
    this._btnTfMore   = document.getElementById('btn-tf-more')
    this._tfDrop      = document.getElementById('tfDrop')
    this._btnCandle   = document.getElementById('btn-candle-type')
    this._candleDrop  = document.getElementById('candleDrop')
    this._btnIndicators = document.getElementById('btn-indicators')
  }

  _bindEvents() {
    // ∨ button → toggle timeframe dropdown
    if (this._btnTfMore) {
      this._btnTfMore.addEventListener('click', (e) => {
        e.stopPropagation()
        this.tfDrop.toggle()
      })
    }

    // Candle type button → toggle candleDrop
    if (this._btnCandle) {
      this._btnCandle.addEventListener('click', (e) => {
        e.stopPropagation()
        this._candleDrop.classList.toggle('open')
      })
    }

    // Candle drop items → emit chart type change + update active state
    if (this._candleDrop) {
      this._candleDrop.addEventListener('click', (e) => {
        const item = e.target.closest('.candle-drop-item')
        if (!item) return
        const type = item.dataset.type
        if (type) {
          emit(EVENTS.CHARTTYPE_CHANGE, type)
          // update active class
          this._candleDrop.querySelectorAll('.candle-drop-item').forEach((el) => {
            el.classList.toggle('active', el === item)
            const check = el.querySelector('.candle-check')
            if (check) check.style.display = el === item ? '' : 'none'
          })
          this._candleDrop.classList.remove('open')
        }
      })
    }

    // Indicators button → toggle #indPanel
    if (this._btnIndicators) {
      this._btnIndicators.addEventListener('click', (e) => {
        e.stopPropagation()
        const panel = document.getElementById('indPanel')
        if (panel) panel.classList.toggle('open')
      })
    }

    // Document click → close candleDrop if outside .candle-wrap
    document.addEventListener('click', (e) => {
      if (this._candleDrop && !e.target.closest('.candle-wrap')) {
        this._candleDrop.classList.remove('open')
      }
    })
  }

  _subscribe() {
    // Pin toggle → update store, re-render toolbar buttons + re-render dropdown stars
    on(EVENTS.TF_PIN_TOGGLE, (tf) => {
      const pinned = [...(get('pinnedTimeframes') || [])]
      const idx    = pinned.indexOf(tf)
      if (idx === -1) {
        pinned.push(tf)
      } else {
        pinned.splice(idx, 1)
      }
      set('pinnedTimeframes', pinned)
      this._renderTfButtons()        // update toolbar buttons
      this.tfDrop._render()          // update dropdown — sao vàng ↔ xám
    })

    // Timeframe change → highlight active button
    on(EVENTS.TIMEFRAME_CHANGE, (tf) => {
      set('timeframe', tf)
      this._highlightActiveTf(tf)
    })
  }

  /**
   * Render pinned timeframe shortcut buttons from store state.
   */
  _renderTfButtons() {
    if (!this._tfButtons) return
    const pinned    = get('pinnedTimeframes') || []
    const activeTf  = get('timeframe')

    this._tfButtons.innerHTML = pinned.map((tf) => `
      <button class="tf-btn${tf === activeTf ? ' active' : ''}" data-tf="${tf}">${tf}</button>
    `).join('')

    // Bind clicks
    this._tfButtons.querySelectorAll('.tf-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tf = btn.dataset.tf
        emit(EVENTS.TIMEFRAME_CHANGE, tf)
      })
    })
  }

  /**
   * Highlight the active TF button without full re-render.
   * @param {string} tf
   */
  _highlightActiveTf(tf) {
    if (!this._tfButtons) return
    this._tfButtons.querySelectorAll('.tf-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tf === tf)
    })
  }
}
