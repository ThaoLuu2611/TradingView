const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/test_chart.html');
  await new Promise(r => setTimeout(r, 500));
  const result = await page.evaluate(() => {
    const chart = window.klinecharts.init('chart');
    const panes = chart._chartStore._chart._paneStore || chart._paneStore;
    if (!panes) return "No paneStore";
    const candlePane = panes._panes ? panes._panes.get('candle_pane') : null;
    if (!candlePane) return "No candle pane";
    const yAxis = candlePane.getAxisComponent();
    return {
       yAxisProto: Object.getOwnPropertyNames(Object.getPrototypeOf(yAxis))
    }
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
