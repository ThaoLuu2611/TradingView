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
    // How to get autoCalc in V9 wrapper?
    // It is deeply nested. Let's just try resetting.
    
    let methods = [];
    try {
      const store = chart.getChartStore();
      methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store));
      
      // Let's try store.getActionStore()?
      const actionStore = store.getActionStore();
      const actionMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(actionStore));
      methods.push(...actionMethods.map(m => 'ActionStore.' + m));
    } catch(e) {}
    
    return { methods };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
