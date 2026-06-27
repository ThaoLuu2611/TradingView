// ---------------------------------------------------------------------------
// drawings.js – Drawing overlay manager for the TradingView-clone app
// ---------------------------------------------------------------------------

import { on } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { fibonacciLineOverlay, fibonacciExtensionOverlay } from './fibonacci.js'

/**
 * Maps left-panel subtool names to KLineCharts createOverlay names.
 * The KLineCharts library uses camelCase identifiers for its built-in overlays.
 * @type {Record<string, string>}
 */
const OVERLAY_NAME_MAP = {
  trendline:                    'segment',
  rayLine:                      'rayLine',
  horizontalLine:               'horizontalLine',
  horizontalRayLine:            'horizontalRayLine',
  verticalLine:                 'verticalLine',
  priceLine:                    'priceLine',
  parallelStraightLine:         'parallelStraightLine',
  fibonacciRetracement:         'customFibonacci', 
  fibonacciExtension:           'customFibExtension',
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

    if (window.klinecharts) {
      window.klinecharts.registerOverlay(fibonacciLineOverlay)
      window.klinecharts.registerOverlay(fibonacciExtensionOverlay)
    }

    // Bind global function so custom overlays can trigger it directly
    window.showTrashBtnForOverlay = (overlayId, klineEvent) => {
      this.showTrashBtn(overlayId, klineEvent)
    }

    on(EVENTS.DRAWING_TOOL, (subtool) => {
      this.setMode(subtool)
    })

    on(EVENTS.DRAWING_CLEAR, () => {
      this.clearAll()
    })
  }

  showTrashBtn(overlayId, klineEvent) {
    const btn = document.getElementById('floating-trash')
    if (!btn) return
    
    let x = 100
    let y = 100
    
    // Attempt to get accurate absolute screen coordinates from the native browser event if possible
    const browserEvent = window.event
    if (browserEvent && browserEvent.clientX !== undefined) {
      x = browserEvent.clientX
      y = browserEvent.clientY
    } else if (klineEvent) {
      if (klineEvent.pageX !== undefined) x = klineEvent.pageX
      else if (klineEvent.clientX !== undefined) x = klineEvent.clientX
      else if (klineEvent.x !== undefined) {
        // If relative to chart container, try to offset
        const rect = document.getElementById('chart-container')?.getBoundingClientRect()
        x = klineEvent.x + (rect ? rect.left : 0)
      }
      
      if (klineEvent.pageY !== undefined) y = klineEvent.pageY
      else if (klineEvent.clientY !== undefined) y = klineEvent.clientY
      else if (klineEvent.y !== undefined) {
        const rect = document.getElementById('chart-container')?.getBoundingClientRect()
        y = klineEvent.y + (rect ? rect.top : 0)
      }
    }
    
    btn.style.left = (x + 15) + 'px'
    btn.style.top = (y - 35) + 'px'
    btn.style.display = 'block'
    btn.style.zIndex = '99999'
    
    // Set delete action
    btn.onclick = (e) => {
      e.stopPropagation()
      if (this._chart) {
        this._chart.removeOverlay(overlayId)
        // Clean up history to prevent ghost undos
        if (this._history) {
          this._history = this._history.filter(id => id !== overlayId)
        }
      }
      btn.style.display = 'none'
    }
    
    // Auto hide when clicking outside
    const hideBtn = (e) => {
      if (e.target !== btn && !btn.contains(e.target)) {
        btn.style.display = 'none'
        document.removeEventListener('click', hideBtn)
      }
    }
    
    setTimeout(() => {
      document.addEventListener('click', hideBtn)
    }, 50)
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
    const id = this._chart.createOverlay(overlayName)
    
    // Store id for undo
    if (id) {
      if (!this._history) this._history = []
      this._history.push(id)
    }
  }

  /**
   * Remove all drawing overlays from the chart.
   */
  clearAll() {
    if (!this._chart) return

    this._chart.removeOverlay()
    this._currentMode = null
    this._history = []
  }

  /**
   * Undo the last drawing action.
   */
  undo() {
    if (!this._chart || !this._history || this._history.length === 0) return
    const lastId = this._history.pop()
    this._chart.removeOverlay(lastId)
  }
}

export const drawingManager = new DrawingManager()

// Bind Ctrl+Z / Cmd+Z globally
document.addEventListener('keydown', (e) => {
  // Check if Ctrl or Cmd is pressed and Z is pressed
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    // Prevent default undo behavior (like input text undo) if focus is not on input
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
      drawingManager.undo()
    }
  }
})
