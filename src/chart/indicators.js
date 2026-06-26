// ---------------------------------------------------------------------------
// indicators.js – Technical indicator manager (KLineChart v9 API)
// ---------------------------------------------------------------------------

import { on, get } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { stochRsiIndicator } from './stochRSI.js'

if (window.klinecharts) {
  window.klinecharts.registerIndicator(stochRsiIndicator)
}

// KLineChart v9: method names are createIndicator / removeIndicator
const INDICATOR_NAME_MAP = {
  MA:   'MA',
  EMA:  'EMA',
  BB:   'BOLL',
  RSI:  'RSI',
  MACD: 'MACD',
  KDJ:  'KDJ',
  WR:   'WR',
  StochRSI: 'STOCHRSI',
}

const OVERLAY_INDICATORS = new Set(['MA', 'EMA', 'BB'])

class IndicatorManager {
  constructor() {
    this._chart   = null
    this._paneIds = new Map() // name → paneId (sub-chart indicators only)
  }

  /**
   * Called from main.js after chart is initialized.
   * @param {object} chart – KLineChart chart instance
   */
  init(chart) {
    this._chart = chart

    // Subscribe to toggle events
    on(EVENTS.INDICATOR_TOGGLE, ({ name, enabled, period }) => {
      if (enabled) {
        this.add(name, { period })
      } else {
        this.remove(name)
      }
    })

    on(EVENTS.INDICATOR_PERIOD, ({ name, period }) => {
      this.updatePeriod(name, period)
    })

    // Auto-render indicators that are enabled by default in store (e.g. RSI)
    this._initFromStore()
  }

  /** Add indicators from store state on first load */
  _initFromStore() {
    const indicators = get('indicators') || {}
    for (const [name, config] of Object.entries(indicators)) {
      if (config.enabled) {
        this.add(name, { period: config.period })
      }
    }
  }

  /**
   * Add a technical indicator to the chart.
   * @param {string} name - app indicator name (e.g. 'RSI')
   * @param {{ period?: number }} [options]
   */
  add(name, options = {}) {
    if (!this._chart) return

    const klineName = INDICATOR_NAME_MAP[name]
    if (!klineName) {
      console.warn(`[IndicatorManager] Unknown indicator: ${name}`)
      return
    }

    // v9 API: pass object with name + optional calcParams
    const period = options.period
    const value = period != null
      ? { name: klineName, calcParams: [period] }
      : { name: klineName }

    try {
      if (OVERLAY_INDICATORS.has(name)) {
        // Overlay on main candle pane
        this._chart.createIndicator(value, false, { id: 'candle_pane' })
      } else {
        // New sub-chart pane; returns paneId
        const paneId = this._chart.createIndicator(value, false)
        if (paneId) this._paneIds.set(name, paneId)
      }
    } catch (e) {
      console.error(`[IndicatorManager] add(${name}) failed:`, e)
    }
  }

  /**
   * Remove a technical indicator from the chart.
   * @param {string} name - app indicator name
   */
  remove(name) {
    if (!this._chart) return

    const klineName = INDICATOR_NAME_MAP[name]
    if (!klineName) return

    try {
      if (OVERLAY_INDICATORS.has(name)) {
        this._chart.removeIndicator('candle_pane', klineName)
      } else {
        const paneId = this._paneIds.get(name)
        if (paneId != null) {
          this._chart.removeIndicator(paneId, klineName)
          this._paneIds.delete(name)
        }
      }
    } catch (e) {
      console.error(`[IndicatorManager] remove(${name}) failed:`, e)
    }
  }

  /**
   * Update period by remove → re-add.
   */
  updatePeriod(name, period) {
    this.remove(name)
    this.add(name, { period })
  }
}

export const indicatorManager = new IndicatorManager()
