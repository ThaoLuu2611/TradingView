// ---------------------------------------------------------------------------
// paneControls.js – Floating action buttons for KLineChart panes
// ---------------------------------------------------------------------------

import { emit, get } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { indicatorManager } from '../chart/indicators.js'

export class PaneControlManager {
  constructor() {
    this._chart = null
    this._attachedPanes = new Set()
    this.maximizedPaneName = null // Track which sub-pane is currently maximized
  }

  init(chart) {
    this._chart = chart
    setTimeout(() => this.attach('candle_pane', 'Main'), 100)
  }

  attach(paneId, name) {
    if (!this._chart) return
    if (this._attachedPanes.has(paneId)) return

    try {
      const paneDom = this._chart.getDom(paneId, 'main')
      if (!paneDom) return

      paneDom.style.position = 'relative'
      paneDom.classList.add('custom-pane-container')

      const controls = document.createElement('div')
      controls.className = 'pane-controls'
      
      const isMain = paneId === 'candle_pane'

      const svgRestore = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>'
      const svgMax = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'

      if (isMain) {
        // Maximize/Restore Button for MAIN chart
        const btnMax = this._createBtn(svgMax, 'Maximize Pane')
        
        let isMaximized = false
        const handleMaxClick = (e) => {
          e.stopPropagation()
          e.preventDefault()
          isMaximized = !isMaximized
          
          const indicators = get('indicators') || {}
          
          if (isMaximized) {
            // Remove sub-indicators from chart to give 100% space to the maximized pane
            for (const [indName, config] of Object.entries(indicators)) {
              if (config.enabled && !['MA','EMA','BB'].includes(indName)) {
                indicatorManager.remove(indName)
              }
            }
            // Clean up internal tracking for sub-panes
            for (const pid of [...this._attachedPanes]) {
              if (pid !== 'candle_pane') this.remove(pid)
            }
          } else {
            // Restore sub-indicators based on store state
            for (const [indName, config] of Object.entries(indicators)) {
              if (config.enabled && !['MA','EMA','BB'].includes(indName)) {
                indicatorManager.add(indName, { calcParams: config.calcParams, lines: config.lines })
              }
            }
          }
          
          if (isMaximized) {
            btnMax.innerHTML = svgRestore
            btnMax.title = 'Restore Pane'
          } else {
            btnMax.innerHTML = svgMax
            btnMax.title = 'Maximize Pane'
          }
        }
        btnMax.addEventListener('pointerdown', handleMaxClick)
        controls.appendChild(btnMax)
        
        paneDom.addEventListener('dblclick', (e) => {
          if (e.target.closest('.pane-controls')) return
          handleMaxClick(e)
        })
      } else {
        // Sub-chart buttons: Maximize, Up, Down, Remove
        const isCurrentlyMaximized = (this.maximizedPaneName === name)
        
        // Maximize
        const btnMax = this._createBtn(
          isCurrentlyMaximized ? svgRestore : svgMax,
          isCurrentlyMaximized ? 'Restore Pane' : 'Maximize Pane'
        )
        
        const handleSubMaxClick = (e) => {
          e.stopPropagation()
          e.preventDefault()
          
          const indicators = get('indicators') || {}
          const container = document.getElementById('chart-container')
          const totalHeight = container ? container.clientHeight : 800
          const safeHeight = Math.max(100, totalHeight - 60) // Leave space for X-axis and minHeight to prevent layout crash
          const isMax = (this.maximizedPaneName === name)
          
          if (!isMax) {
            // 1. We are maximizing this sub-pane
            this.maximizedPaneName = name
            
            // Remove ALL sub-indicators to clear the DOM
            for (const [indName, config] of Object.entries(indicators)) {
              if (config.enabled && !['MA','EMA','BB'].includes(indName)) {
                indicatorManager.remove(indName)
              }
            }
            
            // Add ONLY this sub-pane back, but with full safe height!
            const myConfig = indicators[name]
            if (myConfig) {
              indicatorManager.add(name, { calcParams: myConfig.calcParams, lines: myConfig.lines, height: safeHeight })
            }
            
            // Hide the candle pane's visibility so it doesn't bleed through
            const candleDom = this._chart.getDom('candle_pane', 'main')
            if (candleDom && candleDom.parentNode) {
              candleDom.parentNode.style.visibility = 'hidden'
            }
            
          } else {
            // 2. We are restoring
            this.maximizedPaneName = null
            
            // Remove this full-height pane
            indicatorManager.remove(name)
            
            // Restore all enabled sub-indicators back to normal height
            for (const [indName, config] of Object.entries(indicators)) {
              if (config.enabled && !['MA','EMA','BB'].includes(indName)) {
                indicatorManager.add(indName, { calcParams: config.calcParams, lines: config.lines })
              }
            }
            
            // Restore candle pane's visibility
            const candleDom = this._chart.getDom('candle_pane', 'main')
            if (candleDom && candleDom.parentNode) {
              candleDom.parentNode.style.visibility = 'visible'
            }
          }
          
          // No need to update SVG manually here, because KLineChart will destroy this pane
          // and re-create a new one. When attach() runs on the new pane, it will check
          // this.maximizedPaneName and render the correct SVG!
        }
        btnMax.addEventListener('pointerdown', handleSubMaxClick)
        controls.appendChild(btnMax)
        
        // Move Up
        const btnUp = this._createBtn(
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>',
          'Move Up'
        )
        const handleUpClick = (e) => {
          e.stopPropagation()
          e.preventDefault()
          indicatorManager.move(name, 'up')
        }
        btnUp.addEventListener('pointerdown', handleUpClick)
        controls.appendChild(btnUp)
        
        // Move Down
        const btnDown = this._createBtn(
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
          'Move Down'
        )
        const handleDownClick = (e) => {
          e.stopPropagation()
          e.preventDefault()
          indicatorManager.move(name, 'down')
        }
        btnDown.addEventListener('pointerdown', handleDownClick)
        controls.appendChild(btnDown)

        // Close
        const btnClose = this._createBtn(
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', 
          'Remove'
        )
        const handleCloseClick = (e) => {
          e.stopPropagation()
          e.preventDefault()
          emit(EVENTS.INDICATOR_TOGGLE, { name, enabled: false })
          this.remove(paneId)
        }
        btnClose.addEventListener('pointerdown', handleCloseClick)
        controls.appendChild(btnClose)
      }

      paneDom.appendChild(controls)
      this._attachedPanes.add(paneId)

      paneDom.addEventListener('dblclick', (e) => {
        if (e.target.closest('.pane-controls')) return
        handleSubMaxClick(e)
      })

      // Mobile support: Tap on pane activates the controls
      paneDom.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.pane-controls')) return
        document.querySelectorAll('.custom-pane-container.active-pane').forEach(el => el.classList.remove('active-pane'))
        paneDom.classList.add('active-pane')
      })

      // Desktop support: Add hover explicitly via JS to bypass overlay issues
      paneDom.addEventListener('pointerenter', () => {
        paneDom.classList.add('active-pane')
      })
      paneDom.addEventListener('pointerleave', () => {
        paneDom.classList.remove('active-pane')
      })

    } catch (e) {
      console.error('[PaneControlManager] attach error:', e)
    }
  }

  remove(paneId) {
    this._attachedPanes.delete(paneId)
  }

  _createBtn(svgHtml, title) {
    const btn = document.createElement('button')
    btn.className = 'pc-btn'
    btn.title = title
    btn.innerHTML = svgHtml
    return btn
  }
}

export const paneControlManager = new PaneControlManager()
