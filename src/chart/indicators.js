// ---------------------------------------------------------------------------
// indicators.js – Technical indicator manager (KLineChart v10 API)
// ---------------------------------------------------------------------------

import { on, get, set } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { stochRsiIndicator } from './stochRSI.js'
import { clusterAlgoIndicator } from './clusterAlgo.js'
import { compareIndicator } from './compareIndicator.js'

if (window.klinecharts) {
  window.klinecharts.registerIndicator(stochRsiIndicator)
  window.klinecharts.registerIndicator(clusterAlgoIndicator)
  window.klinecharts.registerIndicator(compareIndicator)
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
  ClusterAlgo: 'CLUSTERALGO',
}

const OVERLAY_INDICATORS = new Set(['MA', 'EMA', 'BB'])

class IndicatorManager {
  constructor() {
    this._chart = null
    this._paneIds = new Map() // name → paneId (sub-chart indicators only)
    this._overlaysAdded = new Set() // name → true (overlay indicators)
    this._paneControlManager = null
  }

  /**
   * Called from main.js after chart is initialized.
   * @param {object} chart – KLineChart chart instance
   */
  init(chart, paneControlManager = null) {
    this._chart = chart
    this._paneControlManager = paneControlManager

    // Subscribe to toggle events
    on(EVENTS.INDICATOR_TOGGLE, ({ name, enabled, calcParams, lines }) => {
      if (enabled) {
        this.add(name, { calcParams, lines })
      } else {
        this.remove(name)
      }
    })

    on(EVENTS.INDICATOR_PERIOD, ({ name, period }) => {
      this.updatePeriod(name, period)
    })

    // Auto-render indicators that are enabled by default in store (e.g. RSI)
    // Wait for the first data to load so CSS grid layout settles and chart allocates height
    let initialized = false
    on(EVENTS.CHART_READY, () => {
      // Give KLineChart's internal layout engine a moment to update pane dimensions
      setTimeout(() => {
        this._initFromStore()
      }, 150)
    })

  }

  /** Reload indicators from store state (useful when chart is recreated) */
  reload() {
    this._initFromStore()
  }

  /** Update chart instance if chart is recreated */
  setChart(chart) {
    this._chart = chart
  }

  /** Add indicators from store state on first load */
  _initFromStore() {
    if (this._isInitialized) return
    this._isInitialized = true

    const indicators = get('indicators') || {}
    for (const [name, config] of Object.entries(indicators)) {
      if (config.enabled) {
        this.add(name, { calcParams: config.calcParams, lines: config.lines })
      }
    }
  }

  /**
   * Add a technical indicator to the chart.
   * @param {string} name - app indicator name (e.g. 'RSI')
   * @param {object} [options]
   */
  add(name, options = {}) {
    if (!this._chart) return

    const klineName = INDICATOR_NAME_MAP[name]
    if (!klineName) {
      console.warn(`[IndicatorManager] Unknown indicator: ${name}`)
      return
    }

    let calcParams = null
    let styles = null
    
    if (options.lines) {
      const enabledLines = options.lines.filter(l => l.enabled);
      
      if (name === 'MA' || name === 'EMA') {
        calcParams = enabledLines.map(l => Number(l.period));
      } else if (options.calcParams) {
        calcParams = options.calcParams;
      }

      if (enabledLines.length > 0) {
        styles = {
          lines: enabledLines.map(l => ({ color: l.color }))
        };
      }
    } else if (options.calcParams) {
      calcParams = options.calcParams;
    } else if (options.period != null) {
      const defaults = {
        BOLL: [20, 2],
        MACD: [12, 26, 9],
        KDJ: [9, 3, 3],
        STOCHRSI: [14, 14, 3, 3]
      };
      calcParams = defaults[klineName] ? [...defaults[klineName]] : [options.period];
      calcParams[0] = options.period;
    }
    
    const value = { name: klineName };
    if (calcParams) value.calcParams = calcParams;
    if (styles) value.styles = styles;

    const isOverlay = OVERLAY_INDICATORS.has(name)
    const isAlreadyAdded = isOverlay ? this._overlaysAdded.has(name) : this._paneIds.has(name)

    // If already added, override it on the same pane to preserve layout order
    if (isAlreadyAdded) {
      const paneId = isOverlay ? 'candle_pane' : this._paneIds.get(name)
      if (this._chart) {
        try {
          this._chart.overrideIndicator(value, paneId)
          
          // Re-apply heights to all sub-panes to prevent KLineChart from resetting the layout and cutting off indicators
          for (const subPaneId of this._paneIds.values()) {
            try { this._chart.setPaneOptions({ id: subPaneId, height: 80, minHeight: 30 }); } catch (e) {}
          }
        } catch (e) {
          console.warn(`[IndicatorManager] Failed to update ${klineName}:`, e)
        }
      }
      return
    }

    try {
      if (isOverlay) {
        // Overlay on main candle pane - stack true so it shares the Y-axis properly
        this._chart.createIndicator(value, { isStack: true, pane: { id: 'candle_pane' } })
        this._overlaysAdded.add(name)
      } else {
        // New sub-chart pane; create without height then setPaneOptions to force layout adjustment
        const paneId = this._chart.createIndicator(value, { isStack: false })
        if (paneId) {
          this._paneIds.set(name, paneId)
          try {
            this._chart.setPaneOptions({ id: paneId, height: 80, minHeight: 30 })
          } catch(e) {}
          // Wait slightly for DOM to be ready before attaching controls
          setTimeout(() => {
            this._paneControlManager?.attach(paneId, name)
          }, 50)
        } else {
          console.warn(`[IndicatorManager] createIndicator returned null for ${klineName}. Possibly due to height limits.`);
        }
      }
    } catch (err) {
      console.error(`[IndicatorManager] Failed to add ${name}:`, err)
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
        this._chart.removeIndicator({ paneId: 'candle_pane', name: klineName })
        this._overlaysAdded.delete(name)
      } else {
        const paneId = this._paneIds.get(name)
        if (paneId != null) {
          this._chart.removeIndicator({ paneId, name: klineName })
          this._paneIds.delete(name)
          this._paneControlManager?.remove(paneId)
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

  /**
   * Move an indicator pane up or down by re-creating all active sub-panes in the new order.
   */
  move(name, direction) {
    if (!this._paneIds.has(name)) return // Only sub-panes can be moved

    const activeNames = Array.from(this._paneIds.keys())
    const idx = activeNames.indexOf(name)
    
    if (direction === 'up' && idx > 0) {
      // Swap with previous
      const temp = activeNames[idx - 1]
      activeNames[idx - 1] = activeNames[idx]
      activeNames[idx] = temp
    } else if (direction === 'down' && idx < activeNames.length - 1) {
      // Swap with next
      const temp = activeNames[idx + 1]
      activeNames[idx + 1] = activeNames[idx]
      activeNames[idx] = temp
    } else {
      return // Cannot move
    }

    const indicators = get('indicators') || {}
    
    // 1. Remove all active sub-panes in current order to free up space
    for (const n of activeNames) {
      this.remove(n)
    }

    // 2. Re-add them in the NEW order
    for (const n of activeNames) {
      if (indicators[n] && indicators[n].enabled) {
        this.add(n, { period: indicators[n].period })
      }
    }
  }
}

export const indicatorManager = new IndicatorManager()
