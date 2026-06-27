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
    // Turn off autoCalc
    // Wait, let's fake a drag event to turn it off naturally!
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const x = rect.right - 10; // y-axis is on the right
    const y = rect.top + 100;
    
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y + 50, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y + 50, bubbles: true }));
    
    // Check if autoCalc is off (by checking visible range or simply by seeing if applyNewData fixes it)
    chart.applyNewData([
      { timestamp: 1600000000000, open: 1, high: 2, low: 0.9, close: 1.5, volume: 100 }
    ]);
    // If it's broken, how to fix?
    // Let's try chart.setPaneOptions
    chart.setPaneOptions({ id: 'candle_pane', state: 'normal' });
    
    // Let's try Double Click!
    canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: x, clientY: y, bubbles: true }));
    
    return "done";
  });
  console.log(result);
  await browser.close();
})();
