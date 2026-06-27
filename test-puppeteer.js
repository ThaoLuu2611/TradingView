const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080');
  
  // Wait for chart to load
  await page.waitForTimeout(2000);
  
  const result = await page.evaluate(() => {
    try {
      // test maximizing a sub pane
      const chart = window.klinecharts.getInstances()[0];
      const panes = [];
      // we can't easily get pane IDs, but let's see if setPaneOptions throws
      chart.setPaneOptions({ id: 'candle_pane', state: 'maximize' });
      return "Success";
    } catch(e) {
      return e.toString();
    }
  });
  console.log("Result:", result);
  await browser.close();
})();
