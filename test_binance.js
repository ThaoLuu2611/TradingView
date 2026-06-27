const fetch = require('node-fetch');
async function test() {
  const r = await fetch('https://api.binance.com/api/v3/exchangeInfo');
  const d = await r.json();
  console.log("Total symbols:", d.symbols.length);
  const sol = d.symbols.filter(s => s.symbol.includes('SOL'));
  console.log("SOL symbols:", sol.length);
}
test();
