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
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const x = rect.right - 10;
    const y = rect.top + 100;
    
    // Fake drag to disable autoCalc
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y + 50, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y + 50, bubbles: true }));
    
    // Hack to extract internal chart instance in V9
    // In V9, the wrapper (Chart) has a getChartStore() method which returns the ChartStore.
    // The ChartStore has a getChart() method which returns the internal ChartImp!
    let chartImp = null;
    let success = false;
    try {
      chartImp = chart.getChartStore().getChart();
      const candlePane = chartImp.getPaneById('candle_pane'); // Maybe getPaneById?
      if (!candlePane) throw new Error("no getPaneById");
    } catch (e1) {
      try {
        // Try accessing via _panes or _paneStore
        chartImp = chart.getChartStore().getChart();
        const panes = chartImp._panes || chartImp._paneStore;
        let candlePane = null;
        if (panes instanceof Map) {
          candlePane = panes.get('candle_pane');
        } else if (panes.get) {
          candlePane = panes.get('candle_pane');
        }
        if (candlePane) {
          const yAxis = candlePane.getYAxisComponent ? candlePane.getYAxisComponent() : candlePane.getAxisComponent();
          if (yAxis && typeof yAxis.setAutoCalcTickFlag === 'function') {
            yAxis.setAutoCalcTickFlag(true);
            success = true;
          }
        }
      } catch (e2) {}
    }
    
    // Also try chartImp._resetYAxisAutoCalcTickFlag()
    let success2 = false;
    try {
      chartImp._resetYAxisAutoCalcTickFlag();
      success2 = true;
    } catch(e) {}

    // Let's dump chartImp keys
    let impKeys = [];
    if (chartImp) {
      impKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(chartImp));
    }
    
    return { success, success2, impKeys };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
