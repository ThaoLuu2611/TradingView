const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><div id="chart"></div>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;

const klinecharts = require('klinecharts');
const chart = klinecharts.init('chart');
console.log(JSON.stringify(chart.getStyles().indicator, null, 2));
