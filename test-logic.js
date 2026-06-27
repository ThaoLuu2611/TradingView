const assert = require('assert');

class MockChart {
  constructor() {
    this.panes = [];
  }
  createIndicator(value, isStack, options) {
    if (options && options.id === 'candle_pane') {
      return 'candle_pane';
    }
    const paneId = 'pane_' + this.panes.length;
    this.panes.push(paneId);
    return paneId;
  }
  overrideIndicator(value, paneId) {
    // ...
  }
}

class IndicatorManager {
  constructor() {
    this._chart = new MockChart()
    this._paneIds = new Map()
    this._overlaysAdded = new Set()
  }

  add(name, options = {}) {
    const klineName = name.toUpperCase()
    const value = { name: klineName }
    const isOverlay = ['MA', 'EMA', 'BB'].includes(name)
    const isAlreadyAdded = isOverlay ? this._overlaysAdded.has(name) : this._paneIds.has(name)

    if (isAlreadyAdded) {
      const paneId = isOverlay ? 'candle_pane' : this._paneIds.get(name)
      this._chart.overrideIndicator(value, paneId)
      return
    }

    if (isOverlay) {
      this._chart.createIndicator(value, false, { id: 'candle_pane' })
      this._overlaysAdded.add(name)
    } else {
      const paneId = this._chart.createIndicator(value, false, { height: 100 })
      if (paneId) {
        this._paneIds.set(name, paneId)
      }
    }
  }
}

const mgr = new IndicatorManager();
mgr.add('EMA');
mgr.add('RSI');
mgr.add('MACD');
mgr.add('StochRSI');

console.log('Overlays added:', mgr._overlaysAdded);
console.log('Pane IDs:', mgr._paneIds);
