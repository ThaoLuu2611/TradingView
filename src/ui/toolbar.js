// ---------------------------------------------------------------------------
// toolbar.js – Timeframe dropdown + Toolbar shortcut buttons
// ---------------------------------------------------------------------------

import { get, set, on, emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { customIntervalModal, addCustomInterval, getCustomIntervals } from './customIntervalModal.js'

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


// Map section title → custom interval unit letter
const SECTION_UNIT = { SECONDS:'s', MINUTES:'m', HOURS:'h', DAYS:'D', WEEKS:'W', MONTHS:'M' }
// Seconds per unit — for sorting custom intervals within a section
const UNIT_SEC_TB  = { s:1, m:60, h:3600, D:86400, W:604800, M:2592000, t:0 }

function tfSeconds(tf) {
  const m = tf.match(/^(\d+)([smhDWMt])$/)
  return m ? parseInt(m[1]) * (UNIT_SEC_TB[m[2]] ?? 0) : Infinity
}

// All intervals that the API can actually serve
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
    const pinned    = get('pinnedTimeframes') || []
    const currentTf = get('timeframe')
    const customs   = getCustomIntervals()  // [{tf, label, unit, value, seconds}]

    // Group custom intervals by unit letter (for merging into sections)
    const customByUnit = {}
    for (const ci of customs) {
      if (!customByUnit[ci.unit]) customByUnit[ci.unit] = []
      customByUnit[ci.unit].push(ci)
    }

    let html = `<div class="tf-drop-add">&#43; Add custom interval...</div>`

    TF_SECTIONS.forEach((section, idx) => {
      if (idx > 0) html += `<div class="tf-divider"></div>`

      html += `
        <div class="tf-drop-section">
          ${section.title}
          <span>&#8963;</span>
        </div>`

      // Merge built-in + custom items for this section, sort by seconds
      const unit      = SECTION_UNIT[section.title]
      const builtIn   = section.items.map(({ label, tf }) => ({ label, tf }))
      const custom    = unit ? (customByUnit[unit] || []) : []
      const merged    = [...builtIn, ...custom]
      merged.sort((a, b) => tfSeconds(a.tf) - tfSeconds(b.tf))

      merged.forEach(({ tf, label }) => {
        const isActive  = tf === currentTf
        const isPinned  = pinned.includes(tf)
        const starClass = isPinned ? 'tf-star on' : 'tf-star'

        html += `
          <div class="tf-drop-item${isActive ? ' active' : ''}" data-tf="${tf}" data-valid="true">
            <span>${label}</span>
            <span class="${starClass}" data-tf="${tf}" title="${isPinned ? 'Unpin' : 'Pin to toolbar'}">&#9733;</span>
          </div>`
      })
    })

    this._drop.innerHTML = html
  }

  _bindEvents() {
    this._drop.addEventListener('click', (e) => {
      // "Add custom interval..." → open modal
      if (e.target.closest('.tf-drop-add')) {
        e.stopPropagation()
        this._drop.classList.remove('open')
        customIntervalModal.open().then((result) => {
          if (!result) return
          addCustomInterval(result)  // chỉ thêm vào list, user bấm ★ để pin
          this._render()
        })
        return
      }

      // Click ANYWHERE on the item (star or row text) -> behave the exact same
      const item = e.target.closest('.tf-drop-item')
      if (item) {
        e.stopPropagation()
        const tf = item.dataset.tf
        const pinned = [...(get('pinnedTimeframes') || [])]
        const idx = pinned.indexOf(tf)
        const pinNow = idx === -1

        // Toggle pin
        if (pinNow) {
          pinned.push(tf)
          // Sort timeline properly by time
          pinned.sort((a, b) => tfSeconds(a) - tfSeconds(b))
        } else {
          pinned.splice(idx, 1)
        }
        set('pinnedTimeframes', pinned)

        // Select this timeframe for the chart
        emit(EVENTS.TIMEFRAME_CHANGE, tf)

        // Close dropdown so user doesn't see it "jump" when toolbar width changes
        this._drop.classList.remove('open')

        // Re-render internal dropdown DOM (stars and active highlights) while closed
        this._render()

        // Update toolbar outside
        if (this._toolbar) this._toolbar._renderTfButtons()
      }
    })

    // Document click/pointer → close if not inside .tf-dropdown-wrap
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.tf-dropdown-wrap')) {
        this._drop.classList.remove('open')
      }
    }, true)
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
    this.tfDrop._toolbar = this    // link ngược để tfDrop gọi _renderTfButtons
    customIntervalModal.init()     // tạo DOM cho modal
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
      const handleMore = (e) => {
        e.stopPropagation()
        this.tfDrop.toggle()
      }
      this._btnTfMore.addEventListener('click', handleMore)
    }

    // Candle type button → toggle candleDrop
    if (this._btnCandle) {
      const handleCandle = (e) => {
        e.stopPropagation()
        this._candleDrop.classList.toggle('open')
      }
      this._btnCandle.addEventListener('click', handleCandle)
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
      const handleInd = (e) => {
        e.stopPropagation()
        const panel = document.getElementById('indPanel')
        if (panel) panel.classList.toggle('open')
      }
      this._btnIndicators.addEventListener('click', handleInd)
    }

    // Document click/pointer → close candleDrop if outside .candle-wrap
    document.addEventListener('pointerdown', (e) => {
      if (this._candleDrop && !e.target.closest('.candle-wrap')) {
        this._candleDrop.classList.remove('open')
      }
    }, true)
  }

  _subscribe() {
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

    // Bind clicks and touches for mobile responsiveness
    this._tfButtons.querySelectorAll('.tf-btn').forEach((btn) => {
      const handleTfSelect = (e) => {
        const tf = btn.dataset.tf
        emit(EVENTS.TIMEFRAME_CHANGE, tf)
      }
      btn.addEventListener('click', handleTfSelect)
      btn.addEventListener('pointerdown', handleTfSelect)
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
