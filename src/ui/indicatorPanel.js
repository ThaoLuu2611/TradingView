// ---------------------------------------------------------------------------
// indicatorPanel.js – Indicator panel popup management
// ---------------------------------------------------------------------------

import { get, set, on, emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'

// ---------------------------------------------------------------------------
// Indicator configuration
// ---------------------------------------------------------------------------

const INDICATORS = [
  { name: 'MA',   label: 'Moving Average',     type: 'overlay',  hasPeriod: true  },
  { name: 'EMA',  label: 'Exp Moving Average', type: 'overlay',  hasPeriod: true  },
  { name: 'BB',   label: 'Bollinger Bands',    type: 'overlay',  hasPeriod: true  },
  { name: 'RSI',  label: 'RSI',                type: 'subchart', hasPeriod: true  },
  { name: 'MACD', label: 'MACD',               type: 'subchart', hasPeriod: false },
  { name: 'KDJ',  label: 'KDJ',                type: 'subchart', hasPeriod: false },
  { name: 'WR',   label: 'Williams %R',        type: 'subchart', hasPeriod: true  },
  { name: 'StochRSI', label: 'Stoch RSI',      type: 'subchart', hasPeriod: true  },
]

// ---------------------------------------------------------------------------
// class IndicatorPanel
// ---------------------------------------------------------------------------

export class IndicatorPanel {
  constructor() {
    this._panel       = null
    this._btnClose    = null
    this._list        = null
    this._searchInput = null
  }

  init() {
    this._bindDOM()
    this._render()
    this._bindEvents()
    this._subscribe()
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _bindDOM() {
    this._panel       = document.getElementById('indPanel')
    this._btnClose    = document.getElementById('btn-ind-close')
    this._list        = document.getElementById('ind-list')
    this._searchInput = document.getElementById('ind-search-input')
  }

  _render() {
    if (!this._list) return

    const indicators = get('indicators') || {}
    const overlay    = INDICATORS.filter((ind) => ind.type === 'overlay')
    const subchart   = INDICATORS.filter((ind) => ind.type === 'subchart')

    let html = ''

    html += this._renderSection('Overlay (on main chart)', overlay, indicators)
    html += this._renderSection('Sub-chart', subchart, indicators)

    this._list.innerHTML = html
  }

  /**
   * Build HTML for one indicator section.
   * @param {string}   sectionTitle
   * @param {object[]} items
   * @param {object}   storeIndicators  – from get('indicators')
   * @returns {string}
   */
  _renderSection(sectionTitle, items, storeIndicators) {
    let html = `<div class="ind-section">${sectionTitle}</div>`

    items.forEach(({ name, label, hasPeriod }) => {
      const state    = storeIndicators[name] || {}
      const enabled  = !!state.enabled
      const period   = state.period ?? ''
      const color    = state.color  ?? null
      const rowClass = enabled ? 'ind-row' : 'ind-row disabled'
      const checkId  = `chk${name}`

      let periodHtml = ''
      if (hasPeriod) {
        periodHtml = `
          <input
            class="ind-period"
            type="number"
            id="period-${name}"
            data-name="${name}"
            value="${period}"
            min="1"
            ${enabled ? '' : 'disabled'}
          />`
      }

      let colorHtml = ''
      if (name === 'MA' && color) {
        colorHtml = `<div class="ind-color" style="background:${color}" title="MA color"></div>`
      }

      html += `
        <div class="${rowClass}" data-name="${name}">
          <input
            type="checkbox"
            id="${checkId}"
            data-name="${name}"
            ${enabled ? 'checked' : ''}
          />
          <label for="${checkId}">${label}</label>
          ${periodHtml}
          ${colorHtml}
        </div>`
    })

    return html
  }

  _bindEvents() {
    // Close button → remove .open from panel
    if (this._btnClose) {
      this._btnClose.addEventListener('click', () => {
        this._panel?.classList.remove('open')
      })
    }

    // Document click → close if outside #indPanel and not #btn-indicators
    document.addEventListener('click', (e) => {
      const btnIndicators = document.getElementById('btn-indicators')
      if (
        this._panel?.classList.contains('open') &&
        !this._panel.contains(e.target) &&
        e.target !== btnIndicators &&
        !btnIndicators?.contains(e.target)
      ) {
        this._panel.classList.remove('open')
      }
    })

    // Search input → filter visible rows
    if (this._searchInput) {
      this._searchInput.addEventListener('input', () => {
        this._filterRows(this._searchInput.value.trim().toLowerCase())
      })
    }

    // Delegate checkbox and period input events on the list container
    if (this._list) {
      // Checkbox change → emit INDICATOR_TOGGLE
      this._list.addEventListener('change', (e) => {
        const checkbox = e.target.closest('input[type="checkbox"][data-name]')
        if (checkbox) {
          const name    = checkbox.dataset.name
          const enabled = checkbox.checked
          emit(EVENTS.INDICATOR_TOGGLE, { name, enabled })
          return
        }

        // Period input change → emit INDICATOR_PERIOD
        const periodInput = e.target.closest('input.ind-period[data-name]')
        if (periodInput) {
          const name   = periodInput.dataset.name
          const period = +periodInput.value
          if (period > 0) {
            emit(EVENTS.INDICATOR_PERIOD, { name, period })
          }
        }
      })
    }
  }

  _subscribe() {
    // Re-render when an indicator is toggled (state has been updated by consumer)
    on(EVENTS.INDICATOR_TOGGLE, ({ name, enabled }) => {
      // Update store indicators state
      const indicators = { ...get('indicators') }
      if (indicators[name]) {
        indicators[name] = { ...indicators[name], enabled }
      }
      set('indicators', indicators)
      this._render()
    })
  }

  /**
   * Filter indicator rows by search query (matches label or name).
   * Sections are shown/hidden based on whether they have visible children.
   * @param {string} query – lower-cased search string
   */
  _filterRows(query) {
    if (!this._list) return

    const rows     = this._list.querySelectorAll('.ind-row[data-name]')
    const sections = this._list.querySelectorAll('.ind-section')

    rows.forEach((row) => {
      const name  = row.dataset.name.toLowerCase()
      // find matching INDICATORS config entry for its label
      const conf  = INDICATORS.find((ind) => ind.name === row.dataset.name)
      const label = conf ? conf.label.toLowerCase() : ''
      const match = !query || name.includes(query) || label.includes(query)
      row.style.display = match ? '' : 'none'
    })

    // Show/hide section headers based on whether any row in their group is visible
    sections.forEach((section) => {
      // Collect all .ind-row siblings until the next .ind-section
      let sibling = section.nextElementSibling
      let hasVisible = false
      while (sibling && !sibling.classList.contains('ind-section')) {
        if (sibling.classList.contains('ind-row') && sibling.style.display !== 'none') {
          hasVisible = true
          break
        }
        sibling = sibling.nextElementSibling
      }
      section.style.display = hasVisible ? '' : 'none'
    })
  }
}
