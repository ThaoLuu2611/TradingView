/**
 * Custom Fibonacci Retracement overlay for KLineChart v9.
 * Emulates the built-in fibonacci tool that was removed in v9 core.
 */

export const fibonacciLineOverlay = {
  name: 'customFibonacci',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  
  // NATIVE v9 OVERLAY CLICK EVENT
  onClick: function (params) {
    if (params && params.overlay && window.showTrashBtnForOverlay) {
      // In v9, params.event might contain clientX, or pageX, or x.
      window.showTrashBtnForOverlay(params.overlay.id, params.event)
    }
    return true
  },

  createPointFigures: ({ coordinates, bounding }) => {
    if (coordinates.length === 0) return []
    
    if (coordinates.length === 1) {
      return [{
        type: 'circle',
        attrs: { x: coordinates[0].x, y: coordinates[0].y, r: 4 },
        styles: { style: 'fill', color: 'rgba(41, 98, 255, 0.8)' }
      }]
    }

    const start = coordinates[0]
    const end = coordinates[1]
    const width = bounding ? bounding.width : 10000
    
    const levels = [
      { value: 0, color: '120, 123, 134' },     // #787B86
      { value: 0.236, color: '244, 67, 54' },   // #F44336
      { value: 0.382, color: '129, 199, 132' }, // #81C784
      { value: 0.5, color: '76, 175, 80' },     // #4CAF50
      { value: 0.618, color: '0, 150, 136' },   // #009688
      { value: 0.786, color: '100, 181, 246' }, // #64B5F6
      { value: 1, color: '120, 123, 134' }      // #787B86
    ]

    const figures = []

    for (let i = 0; i < levels.length - 1; i++) {
      const topLevel = levels[i]
      const bottomLevel = levels[i + 1]
      const y1 = start.y + (end.y - start.y) * topLevel.value
      const y2 = start.y + (end.y - start.y) * bottomLevel.value
      
      figures.push({
        type: 'polygon',
        attrs: {
          coordinates: [
            { x: start.x, y: y1 },
            { x: width, y: y1 },
            { x: width, y: y2 },
            { x: start.x, y: y2 }
          ]
        },
        styles: { style: 'fill', color: `rgba(${bottomLevel.color}, 0.15)` } // Bolder background
      })
    }

    levels.forEach(level => {
      const y = start.y + (end.y - start.y) * level.value
      
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: start.x, y }, { x: width, y }] },
        styles: { style: 'solid', color: `rgba(${level.color}, 0.8)`, size: 1 } // Bolder pastel lines
      })

      figures.push({
        type: 'text',
        attrs: { x: start.x, y: y - 12, text: `${level.value}` },
        styles: { color: `rgba(${level.color}, 0.9)`, size: 12, backgroundColor: 'transparent' }
      })
    })

    figures.push({
      type: 'line',
      attrs: { coordinates: [start, end] },
      styles: { style: 'dashed', color: 'rgba(120, 123, 134, 0.6)', size: 1, dashedValue: [4, 4] }
    })

    return figures
  }
}

export const fibonacciExtensionOverlay = {
  name: 'customFibExtension',
  totalStep: 4,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,

  onClick: function (params) {
    if (params && params.overlay && window.showTrashBtnForOverlay) {
      window.showTrashBtnForOverlay(params.overlay.id, params.event)
    }
    return true
  },

  createPointFigures: ({ coordinates, bounding }) => {
    if (coordinates.length === 0) return []
    
    if (coordinates.length < 3) {
      const pts = coordinates.map(c => ({ x: c.x, y: c.y }))
      return [{
        type: 'line',
        attrs: { coordinates: pts },
        styles: { style: 'dashed', color: 'rgba(41, 98, 255, 0.6)', size: 1, dashedValue: [4, 4] }
      }]
    }

    const start = coordinates[0]
    const mid = coordinates[1]
    const end = coordinates[2]
    const width = bounding ? bounding.width : 10000
    
    const diffY = mid.y - start.y
    const levels = [
      { value: 0, color: '120, 123, 134' },
      { value: 0.236, color: '244, 67, 54' },
      { value: 0.382, color: '129, 199, 132' },
      { value: 0.5, color: '76, 175, 80' },
      { value: 0.618, color: '0, 150, 136' },
      { value: 0.786, color: '100, 181, 246' },
      { value: 1, color: '120, 123, 134' },
      { value: 1.618, color: '41, 98, 255' } // #2962FF
    ]

    const figures = []

    for (let i = 0; i < levels.length - 1; i++) {
      const topL = levels[i]
      const botL = levels[i + 1]
      const y1 = end.y + diffY * topL.value
      const y2 = end.y + diffY * botL.value
      
      figures.push({
        type: 'polygon',
        attrs: {
          coordinates: [
            { x: start.x, y: y1 },
            { x: width, y: y1 },
            { x: width, y: y2 },
            { x: start.x, y: y2 }
          ]
        },
        styles: { style: 'fill', color: `rgba(${botL.color}, 0.15)` } // Bolder background
      })
    }

    levels.forEach(level => {
      const y = end.y + diffY * level.value
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: start.x, y }, { x: width, y }] },
        styles: { style: 'solid', color: `rgba(${level.color}, 0.8)`, size: 1 } // Bolder lines
      })

      figures.push({
        type: 'text',
        attrs: { x: start.x, y: y - 12, text: `${level.value}` },
        styles: { color: `rgba(${level.color}, 0.9)`, size: 12, backgroundColor: 'transparent' }
      })
    })

    figures.push({
      type: 'line',
      attrs: { coordinates: [start, mid, end] },
      styles: { style: 'dashed', color: 'rgba(120, 123, 134, 0.6)', size: 1, dashedValue: [4, 4] }
    })

    return figures
  }
}
