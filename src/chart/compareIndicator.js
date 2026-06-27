export const compareIndicator = {
  name: 'CompareSymbol',
  shortName: 'Compare',
  calc: (kLineDataList, { calcParams }) => {
    const compareData = calcParams[0] || []
    const symbol = calcParams[1] || 'Compare'
    const color = calcParams[2] || '#f5a623'
    
    const dataMap = new Map()
    for (const d of compareData) {
      dataMap.set(d.timestamp, d.close)
    }
    
    return kLineDataList.map(kline => {
      const c = dataMap.get(kline.timestamp)
      return { close: c !== undefined ? c : null, symbol }
    })
  },
  figures: [
    {
      key: 'close',
      title: 'Close',
      type: 'line',
      styles: { color: '#f5a623' }
    }
  ]
}
