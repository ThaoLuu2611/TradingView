const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/klinecharts@9/dist/klinecharts.min.js"></script>
    </head>
    <body style="margin: 0; padding: 0;">
      <div id="chart" style="width: 100%; height: 400px; background: #eee;"></div>
      <script>
        const chart = klinecharts.init('chart');
        chart.applyNewData([{ close: 10, high: 12, low: 9, open: 11, timestamp: 1 }]);
        
        try {
          const value = { name: 'EMA', calcParams: [7, 25, 99] };
          chart.createIndicator(value, false, { id: 'candle_pane' });
          console.log('EMA added');
          
          const value2 = { name: 'RSI', calcParams: [14] };
          const p1 = chart.createIndicator(value2, false, { height: 100 });
          console.log('RSI added', p1);
          
          const value3 = { name: 'MACD', calcParams: [12, 26, 9] };
          const p2 = chart.createIndicator(value3, false, { height: 100 });
          console.log('MACD added', p2);
          
          const value4 = { name: 'STOCHRSI', calcParams: [14, 14, 3, 3] };
          // StochRSI is not registered, so it will return null or throw
          const p3 = chart.createIndicator(value4, false, { height: 100 });
          console.log('STOCHRSI added', p3);
        } catch (e) {
          console.error(e.message);
        }
      </script>
    </body>
    </html>
  `);
  
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
