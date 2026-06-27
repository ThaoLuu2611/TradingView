const JSDOM = require("jsdom").JSDOM;
const dom = new JSDOM(`<!DOCTYPE html><div id="chart-container" style="width:800px;height:600px;"></div>`);
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
const klinecharts = require("klinecharts");
const chart = klinecharts.init('chart-container');
console.log(document.getElementById('chart-container').innerHTML);
