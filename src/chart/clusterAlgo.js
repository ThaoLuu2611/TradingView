export const clusterAlgoIndicator = {
  name: 'CLUSTERALGO',
  shortName: 'Cluster Algo',
  series: 'normal',
  calcParams: [14, 20, 2], // RSI Length, BB Length, BB Mult
  precision: 2,
  figures: [
    { key: 'rsi', title: 'RSI: ', type: 'line' },
    { key: 'bbBasis', title: 'Basis: ', type: 'line' },
    { key: 'bbUpper', title: 'Upper: ', type: 'line' },
    { key: 'bbLower', title: 'Lower: ', type: 'line' }
  ],
  styles: {
    lines: [
      { color: '#26a69a', size: 2, style: 'solid' }, // rsi (Green)
      { color: '#ef5350', size: 1, style: 'solid' }, // bbBasis (Red)
      { color: '#787b86', size: 1, style: 'dashed' }, // bbUpper
      { color: '#787b86', size: 1, style: 'dashed' }  // bbLower
    ]
  },
  calc: (dataList, indicator) => {
    const params = indicator.calcParams || []
    const rsiLength = Number(params[0]) || 14
    const bbLength = Number(params[1]) || 20
    const bbMult = Number(params[2]) || 2

    const rsiValues = new Array(dataList.length).fill(null)
    let gain = 0
    let loss = 0
    
    for (let i = 1; i < dataList.length; i++) {
      const c1 = dataList[i].close
      const c0 = dataList[i - 1].close
      if (typeof c1 !== 'number' || isNaN(c1) || typeof c0 !== 'number' || isNaN(c0)) {
        rsiValues[i] = rsiValues[i - 1] || null
        continue
      }
      
      const change = c1 - c0
      if (i <= rsiLength) {
        gain += Math.max(0, change)
        loss += Math.max(0, -change)
        if (i === rsiLength) {
          gain /= rsiLength
          loss /= rsiLength
          const rs = loss === 0 ? 100 : gain / loss
          rsiValues[i] = loss === 0 ? 100 : 100 - (100 / (1 + rs))
        }
      } else {
        gain = (gain * (rsiLength - 1) + Math.max(0, change)) / rsiLength
        loss = (loss * (rsiLength - 1) + Math.max(0, -change)) / rsiLength
        const rs = loss === 0 ? 100 : gain / loss
        rsiValues[i] = loss === 0 ? 100 : 100 - (100 / (1 + rs))
      }
    }

    return dataList.map((kLineData, i) => {
      const result = { rsi: rsiValues[i], bbBasis: null, bbUpper: null, bbLower: null }
      
      if (i < bbLength - 1 || rsiValues[i] === null) return result
      
      let sum = 0
      let count = 0
      for (let j = 0; j < bbLength; j++) {
        if (rsiValues[i - j] !== null) {
          sum += rsiValues[i - j]
          count++
        }
      }
      
      if (count === 0) return result
      
      const basis = sum / count
      
      let varianceSum = 0
      for (let j = 0; j < bbLength; j++) {
        if (rsiValues[i - j] !== null) {
          varianceSum += Math.pow(rsiValues[i - j] - basis, 2)
        }
      }
      
      const stdev = Math.sqrt(varianceSum / count)
      
      result.bbBasis = basis
      result.bbUpper = basis + bbMult * stdev
      result.bbLower = basis - bbMult * stdev
      
      return result
    })
  }
}
