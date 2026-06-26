// ---------------------------------------------------------------------------
// drawings.js – Drawing overlay manager for the TradingView-clone app
// ---------------------------------------------------------------------------

import { on } from '../store/store.js'
import { EVENTS } from '../store/events.js'

/**
 * Maps left-panel subtool names to KLineCharts createOverlay names.
 * The KLineCharts library uses camelCase identifiers for its built-in overlays.
 * @type {Record<string, string>}
 */
const OVERLAY_NAME_MAP = {
  trendline:                    'trendLine',
  rayLine:                      'rayLine',
  horizontalLine:               'horizontalLine',
  horizontalRayLine:            'horizontalRayLine',
  verticalLine:                 'verticalLine',
  priceLine:                    'priceLine',
  parallelStraightLine:         'parallelStraightLine',
  fibonacciRetracement:         'fibonacciRetracement',
  fibonacciExtension:           'fibonacciExtension',
  fibonacciChannel:             'fibonacciChannel',
  fibonacciSpeedResistanceFan:  'fibonacciSpeedResistanceFan',
}

class DrawingManager {
  constructor() {
    /** @type {ReturnType<typeof klinecharts.init> | null} */
    this._chart = null

    /** @type {string | null} Currently active drawing subtool name (app format). */
    this._currentMode = null
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Attach the chart instance and subscribe to drawing store events.
   * @param {import('klinecharts').Chart} chart
   */
  init(chart) {
    this._chart = chart

    on(EVENTS.DRAWING_TOOL, (subtool) => {
      this.setMode(subtool)
    })

    on(EVENTS.DRAWING_CLEAR, () => {
      this.clearAll()
    })
  }

  /**
   * Activate a drawing mode by creating the corresponding KLineCharts overlay.
   * @param {string} subtool  - App-facing subtool name (e.g. 'trendline')
   */
  setMode(subtool) {
    if (!this._chart) return

    const overlayName = OVERLAY_NAME_MAP[subtool]
    if (!overlayName) {
      console.warn(`[DrawingManager] Unknown drawing subtool: ${subtool}`)
      return
    }

    this._currentMode = subtool
    this._chart.createOverlay(overlayName)
  }

  /**
   * Remove all drawing overlays from the chart.
   */
  clearAll() {
    if (!this._chart) return

    this._chart.removeOverlay()
    this._currentMode = null
  }
}

export const drawingManager = new DrawingManager()
