// ---------------------------------------------------------------------------
// indicatorModal.js – Advanced Binance-style Indicator Settings Modal
// ---------------------------------------------------------------------------

import { get, set, emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'

const INDICATORS = [
  { type: 'main', name: 'MA', label: 'Moving Average', hasLines: true },
  { type: 'main', name: 'EMA', label: 'Exp Moving Average', hasLines: true },
  { type: 'main', name: 'BB', label: 'Bollinger Bands', hasLines: true },
  { type: 'sub', name: 'RSI', label: 'Relative Strength Index', hasLines: true },
  { type: 'sub', name: 'MACD', label: 'MACD', hasLines: true },
  { type: 'sub', name: 'KDJ', label: 'KDJ', hasLines: true },
  { type: 'sub', name: 'WR', label: 'Williams %R', hasLines: true },
  { type: 'sub', name: 'StochRSI', label: 'Stochastic RSI', hasLines: true },
  { type: 'sub', name: 'ClusterAlgo', label: 'Cluster Algo', hasLines: true }
]

export class IndicatorModal {
  constructor() {
    this._overlay = null
    this._activeTab = 'main'
    this._activeInd = 'MA'
    this._tempState = {}
  }

  init() {
    this._bindDOM()
    this._bindEvents()
  }

  _bindDOM() {
    this._overlay = document.getElementById('indModalOverlay')
    this._tabs = document.querySelectorAll('.ind-modal-tab')
    this._sidebarList = document.getElementById('ind-sidebar-list')
    this._sidebarTitle = document.getElementById('ind-sidebar-title')
    this._contentTitle = document.getElementById('ind-content-title')
    this._contentSettings = document.getElementById('ind-content-settings')
    
    this._btnClose = document.getElementById('btn-ind-modal-close')
    this._btnReset = document.getElementById('btn-ind-reset')
    this._btnSave = document.getElementById('btn-ind-save')
    this._btnOpen = document.getElementById('btn-indicators')
  }

  _bindEvents() {
    if (this._btnOpen) {
      this._btnOpen.addEventListener('click', () => this.open())
    }
    
    if (this._btnClose) {
      this._btnClose.addEventListener('click', () => this.close())
    }
    
    if (this._overlay) {
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) this.close()
      })
    }

    this._tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this._activeTab = tab.dataset.tab
        this._tabs.forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        
        const firstInd = INDICATORS.find(ind => ind.type === this._activeTab)
        if (firstInd) this._activeInd = firstInd.name
        
        this._render()
      })
    })

    if (this._btnSave) {
      this._btnSave.addEventListener('click', () => this.save())
    }
    
    if (this._btnReset) {
      this._btnReset.addEventListener('click', () => this.reset())
    }
  }

  open() {
    this._tempState = JSON.parse(JSON.stringify(get('indicators') || {}))
    this._activeTab = 'main'
    this._activeInd = 'MA'
    this._tabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === this._activeTab)
    })
    this._render()
    if (this._overlay) this._overlay.classList.add('open')
  }

  close() {
    if (this._overlay) this._overlay.classList.remove('open')
  }

  async save() {
    set('indicators', this._tempState)
    
    const { forceSave } = await import('../store/store.js')
    forceSave()
    
    for (const [name, config] of Object.entries(this._tempState)) {
      emit(EVENTS.INDICATOR_TOGGLE, { name, enabled: config.enabled, calcParams: config.calcParams, lines: config.lines })
    }
    
    this.close()
  }

  reset() {
    import('../store/store.js').then(({ DEFAULT_INDICATORS, set, forceSave }) => {
      this._tempState = JSON.parse(JSON.stringify(DEFAULT_INDICATORS))
      this._render()
    })
  }

  _render() {
    this._renderSidebar()
    this._renderContent()
  }

  _renderSidebar() {
    if (!this._sidebarTitle || !this._sidebarList) return

    this._sidebarTitle.textContent = this._activeTab === 'main' ? 'Main' : 'Sub'
    
    const items = INDICATORS.filter(ind => ind.type === this._activeTab)
    let html = ''
    items.forEach(ind => {
      const state = this._tempState[ind.name] || {}
      const isSelected = this._activeInd === ind.name
      const isChecked = !!state.enabled
      
      html += `
        <div class="ind-sidebar-item ${isSelected ? 'selected' : ''}" data-name="${ind.name}">
          <input type="checkbox" class="ind-chk" data-name="${ind.name}" ${isChecked ? 'checked' : ''} />
          <div class="ind-name">${ind.name}</div>
          <div class="ind-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
      `
    })
    this._sidebarList.innerHTML = html

    const rows = this._sidebarList.querySelectorAll('.ind-sidebar-item')
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('ind-chk')) return
        this._activeInd = row.dataset.name
        this._render()
      })
      
      const chk = row.querySelector('.ind-chk')
      if (chk) {
        chk.addEventListener('change', (e) => {
          const name = e.target.dataset.name
          this._tempState[name] = this._tempState[name] || {}
          this._tempState[name].enabled = e.target.checked
          this._applyChanges()
        })
      }
    })
  }

  _renderContent() {
    if (!this._contentTitle || !this._contentSettings) return

    const ind = INDICATORS.find(i => i.name === this._activeInd)
    if (!ind) return
    
    this._contentTitle.textContent = `${ind.name} - ${ind.label}`
    
    const state = this._tempState[ind.name] || {}
    
    let html = ''
    if (ind.hasLines && state.lines) {
      state.lines.forEach((line, index) => {
        html += `
          <div class="ind-setting-row">
            <input type="checkbox" class="ind-chk line-chk" data-idx="${index}" ${line.enabled ? 'checked' : ''} />
            <div class="ind-label">${ind.name}${index + 1}</div>
            <input type="number" class="ind-setting-input line-period" data-idx="${index}" value="${line.period}" />
            <select class="ind-setting-select"><option>Close</option></select>
            <select class="ind-setting-select" style="max-width:80px;"><option>Solid</option></select>
            <input type="color" class="ind-color-picker line-color" data-idx="${index}" value="${line.color}" />
          </div>
        `
      })
    } else {
      const firstParam = (state.calcParams && state.calcParams[0]) || state.period || ''
      html = `
        <div class="ind-setting-row">
          <div class="ind-label" style="width:100px;">Period</div>
          <input type="number" class="ind-setting-input simple-period" value="${firstParam}" />
        </div>
      `
    }
    
    this._contentSettings.innerHTML = html

    if (ind.hasLines && state.lines) {
      this._contentSettings.querySelectorAll('.line-chk').forEach(el => {
        el.addEventListener('change', e => {
          const idx = parseInt(e.target.dataset.idx)
          this._tempState[ind.name].lines[idx].enabled = e.target.checked
          this._applyChanges()
        })
      })
      this._contentSettings.querySelectorAll('.line-period').forEach(el => {
        el.addEventListener('input', e => {
          const idx = parseInt(e.target.dataset.idx)
          this._tempState[ind.name].lines[idx].period = Number(e.target.value)
          this._applyChanges()
        })
      })
      this._contentSettings.querySelectorAll('.line-color').forEach(el => {
        el.addEventListener('input', e => {
          const idx = parseInt(e.target.dataset.idx)
          this._tempState[ind.name].lines[idx].color = e.target.value
          this._applyChanges()
        })
      })
    } else {
      const sp = this._contentSettings.querySelector('.simple-period')
      if (sp) {
        sp.addEventListener('input', e => {
          this._tempState[ind.name] = this._tempState[ind.name] || {}
          this._tempState[ind.name].calcParams = this._tempState[ind.name].calcParams || [14]
          this._tempState[ind.name].calcParams[0] = Number(e.target.value)
          this._applyChanges()
        })
      }
    }
  }

  _applyChanges() {
    for (const [name, config] of Object.entries(this._tempState)) {
      emit(EVENTS.INDICATOR_TOGGLE, { name, enabled: config.enabled, calcParams: config.calcParams, lines: config.lines })
    }
  }
}
