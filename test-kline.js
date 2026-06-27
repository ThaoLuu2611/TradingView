const fs = require('fs');
const content = fs.readFileSync('node_modules/klinecharts/dist/index.esm.js', 'utf8');
const match = content.match(/function\s+createIndicator[^{]*\{([^}]*)\}/);
console.log(match ? match[0] : 'not found');
