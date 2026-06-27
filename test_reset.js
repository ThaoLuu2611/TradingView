const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/test_chart.html');
  await new Promise(r => setTimeout(r, 1000));
  
  const result = await page.evaluate(() => {
    const chart = window.myChart;
    // Get the yAxis
    const yAxis = chart.getChart().getPaneById('candle_pane').getAxisComponent();
    // Drag it to disable autoCalc
    yAxis.setAutoCalcTickFlag(false);
    let before = yAxis.getAutoCalcTickFlag();
    
    // Now try to reset it
    // Method 1: applyNewData with empty array?
    chart.applyNewData([]);
    let afterEmpty = yAxis.getAutoCalcTickFlag();
    
    // Method 2: clear()?
    // No, clear() clears all overlays too maybe? But let's check
    chart.getChart()._resetYAxisAutoCalcTickFlag(); // It's internal?
    let afterInternal = yAxis.getAutoCalcTickFlag();
    
    return { before, afterEmpty, afterInternal, hasInternal: typeof chart.getChart()._resetYAxisAutoCalcTickFlag === 'function' };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
