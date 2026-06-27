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
        chart.createIndicator({ name: 'RSI', calcParams: [14] }, true, { id: 'pane_RSI' });
        window.myChart = chart;
      </script>
    </body>
    </html>
  `;
  await page.setContent(html);
  
  const result = await page.evaluate(() => {
    const chart = window.myChart;
    const inds = chart.getIndicators();
    return inds.map(i => ({ name: i.name, calcParams: i.calcParams, paneId: i.paneId }));
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
