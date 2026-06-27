/**
 * Custom Stochastic RSI indicator for KLineCharts
 */

export const stochRsiIndicator = {
  name: 'STOCHRSI',
  shortName: 'StochRSI',
  series: 'normal',
  calcParams: [14, 14, 3, 3], // [RSI length, Stoch length, K smooth, D smooth]
  precision: 2,
  figures: [
    { key: 'k', title: '%K: ', type: 'line' },
    { key: 'd', title: '%D: ', type: 'line' }
  ],
  styles: {
    lines: [
      { color: '#2962ff', size: 1, style: 'solid' },
      { color: '#00bcd4', size: 1, style: 'solid' }
    ]
  },
  calc: (dataList, indicator) => {
    const params = indicator.calcParams || []
    const rsiLength = Number(params[0]) || 14
    const stochLength = Number(params[1]) || 14
    const kSmooth = Number(params[2]) || 3
    const dSmooth = Number(params[3]) || 3

    const results = []
    
    if (dataList.length < rsiLength) {
      return dataList.map(() => ({ k: null, d: null }))
    }

    const rsiValues = new Array(dataList.length).fill(null)
    let gain = 0
    let loss = 0
    
    for (let i = 1; i < dataList.length; i++) {
      const c1 = dataList[i].close
      const c0 = dataList[i - 1].close
      
      // Prevent NaN contagion
      if (typeof c1 !== 'number' || isNaN(c1) || typeof c0 !== 'number' || isNaN(c0)) {
        rsiValues[i] = rsiValues[i - 1] || null
        continue
      }

      const change = c1 - c0
      const cg = change > 0 ? change : 0
      const cl = change < 0 ? -change : 0

      if (i <= rsiLength) {
        gain += cg
        loss += cl
        if (i === rsiLength) {
          gain /= rsiLength
          loss /= rsiLength
          rsiValues[i] = loss === 0 ? 100 : 100 - (100 / (1 + gain / loss))
        }
      } else {
        gain = (gain * (rsiLength - 1) + cg) / rsiLength
        loss = (loss * (rsiLength - 1) + cl) / rsiLength
        rsiValues[i] = loss === 0 ? 100 : 100 - (100 / (1 + gain / loss))
      }
    }

    const stochRsiValues = new Array(dataList.length).fill(null)
    for (let i = rsiLength + stochLength - 1; i < rsiValues.length; i++) {
      let maxRsi = -Infinity
      let minRsi = Infinity
      for (let j = 0; j < stochLength; j++) {
        const val = rsiValues[i - j]
        if (typeof val === 'number' && !isNaN(val)) {
          if (val > maxRsi) maxRsi = val
          if (val < minRsi) minRsi = val
        }
      }
      if (maxRsi === minRsi || maxRsi === -Infinity || isNaN(maxRsi) || isNaN(minRsi)) {
        stochRsiValues[i] = 0
      } else {
        stochRsiValues[i] = ((rsiValues[i] - minRsi) / (maxRsi - minRsi)) * 100
      }
    }

    const kValues = new Array(dataList.length).fill(null)
    for (let i = rsiLength + stochLength + kSmooth - 2; i < stochRsiValues.length; i++) {
      let sum = 0
      let count = 0
      for (let j = 0; j < kSmooth; j++) {
        const val = stochRsiValues[i - j]
        if (typeof val === 'number' && !isNaN(val)) {
          sum += val
          count++
        }
      }
      kValues[i] = count > 0 ? sum / count : null
    }

    for (let i = 0; i < kValues.length; i++) {
      let k = kValues[i]
      let d = null

      if (i >= rsiLength + stochLength + kSmooth + dSmooth - 3) {
        let sum = 0
        let count = 0
        for (let j = 0; j < dSmooth; j++) {
          const val = kValues[i - j]
          if (typeof val === 'number' && !isNaN(val)) {
            sum += val
            count++
          }
        }
        if (count > 0) d = sum / count
      }
      
      // Ensure we don't push NaN to UI
      results.push({ 
        k: isNaN(k) ? null : k, 
        d: isNaN(d) ? null : d 
      })
    }

    return results
  }
}
