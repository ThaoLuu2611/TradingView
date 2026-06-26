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
  calc: (dataList, indicator) => {
    const params = indicator.calcParams
    const rsiLength = params[0]
    const stochLength = params[1]
    const kSmooth = params[2]
    const dSmooth = params[3]

    let gain = 0
    let loss = 0
    const rsiValues = []
    
    // 1. Calculate RSI
    for (let i = 0; i < dataList.length; i++) {
      if (i === 0) {
        rsiValues.push(null)
        continue
      }
      const change = dataList[i].close - dataList[i - 1].close
      
      // Initial SMA for first RSI value
      if (i < rsiLength) {
        if (change > 0) gain += change
        else loss -= change
        rsiValues.push(null)
      } else if (i === rsiLength) {
        if (change > 0) gain += change
        else loss -= change
        gain /= rsiLength
        loss /= rsiLength
        rsiValues.push(loss === 0 ? 100 : 100 - (100 / (1 + gain / loss)))
      } else {
        // RMA smoothing
        const currentGain = change > 0 ? change : 0
        const currentLoss = change < 0 ? -change : 0
        gain = (gain * (rsiLength - 1) + currentGain) / rsiLength
        loss = (loss * (rsiLength - 1) + currentLoss) / rsiLength
        rsiValues.push(loss === 0 ? 100 : 100 - (100 / (1 + gain / loss)))
      }
    }

    // 2. Calculate StochRSI
    const stochRsiValues = []
    for (let i = 0; i < rsiValues.length; i++) {
      if (i < rsiLength + stochLength - 1 || rsiValues[i] === null) {
        stochRsiValues.push(null)
        continue
      }
      let maxRsi = -Infinity
      let minRsi = Infinity
      for (let j = 0; j < stochLength; j++) {
        const rsi = rsiValues[i - j]
        if (rsi > maxRsi) maxRsi = rsi
        if (rsi < minRsi) minRsi = rsi
      }
      if (maxRsi === minRsi) {
        stochRsiValues.push(0)
      } else {
        stochRsiValues.push(((rsiValues[i] - minRsi) / (maxRsi - minRsi)) * 100)
      }
    }

    // 3. Calculate %K (SMA of StochRSI)
    const kValues = []
    for (let i = 0; i < stochRsiValues.length; i++) {
      if (i < rsiLength + stochLength + kSmooth - 2 || stochRsiValues[i] === null) {
        kValues.push(null)
        continue
      }
      let sum = 0
      for (let j = 0; j < kSmooth; j++) {
        sum += stochRsiValues[i - j]
      }
      kValues.push(sum / kSmooth)
    }

    // 4. Calculate %D (SMA of %K)
    const results = []
    for (let i = 0; i < kValues.length; i++) {
      if (i < rsiLength + stochLength + kSmooth + dSmooth - 3 || kValues[i] === null) {
        results.push({ k: kValues[i], d: null })
        continue
      }
      let sum = 0
      for (let j = 0; j < dSmooth; j++) {
        sum += kValues[i - j]
      }
      results.push({ k: kValues[i], d: sum / dSmooth })
    }

    return results
  }
}
