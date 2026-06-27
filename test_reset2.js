const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/klinecharts/dist/klinecharts.min.js"></script>
    </head>
    <body>
      <div id="chart" style="width:600px;height:400px"></div>
      <script>
        const chart = klinecharts.init('chart');
        chart.applyNewData([
          { timestamp: 1600000000000, open: 1000, high: 1200, low: 900, close: 1100, volume: 100 },
          { timestamp: 1600000060000, open: 1100, high: 1300, low: 1000, close: 1200, volume: 120 }
        ]);
        window.myChart = chart;
      </script>
    </body>
    </html>
  `;
  await page.setContent(html);
  
  const result = await page.evaluate(() => {
    const chart = window.myChart;
    // Turn off autoCalc (simulate dragging)
    const yAxis = chart.getCandlePane().getYAxisComponent();
    // Wait, getCandlePane might be private, but it's in the list
    yAxis.setAutoCalcTickFlag(false);
    
    const before = yAxis.getAutoCalcTickFlag();
    
    // Attempt 1: setPaneOptions
    // chart.setPaneOptions({ id: 'candle_pane', axisOptions: { autoCalc: true } });
    // Attempt 2: chart.getChartStore()
    const store = chart.getChartStore();
    // does store have setSymbol?
    if (typeof store.setSymbol === 'function') {
      store.setSymbol("NEW_SYMBOL");
    }
    
    // Or does chart have setStyles? 
    // chart.setStyles({ yAxis: { autoCalc: true } }); // does it work?
    
    const afterStore = yAxis.getAutoCalcTickFlag();
    
    // Attempt 3: call setAutoCalcTickFlag directly!
    yAxis.setAutoCalcTickFlag(true);
    const afterDirect = yAxis.getAutoCalcTickFlag();
    
    return { before, afterStore, afterDirect, storeMethods: Object.keys(Object.getPrototypeOf(store)) };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
