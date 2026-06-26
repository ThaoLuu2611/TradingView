const http = require('http');
const fs = require('fs');
http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    fs.appendFileSync('browser.log', body + '\n');
    res.writeHead(200);
    res.end('ok');
  });
}).listen(8081, () => console.log('Logger listening on 8081'));
