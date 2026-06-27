const fs = require('fs');
const content = fs.readFileSync('node_modules/klinecharts/dist/index.esm.js', 'utf8');
const match = content.match(/styles[^{]*\{[^}]*\}/g);
console.log(match ? match.slice(0, 5).join('\n') : 'not found');
