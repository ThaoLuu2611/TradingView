const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/test_chart.html');
  await page.waitForTimeout(1000);
  const result = await page.evaluate(() => {
    return Object.keys(window.klinecharts.init('chart')._chartStore._paneStore._panes.get('candle_pane').getAxisComponent());
  });
  console.log(result);
  await browser.close();
})();
