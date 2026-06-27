const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/test_chart.html');
  await new Promise(r => setTimeout(r, 500));
  const result = await page.evaluate(() => {
    const chart = window.klinecharts.init('chart');
    return {
       methods: Object.keys(chart)
    }
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
