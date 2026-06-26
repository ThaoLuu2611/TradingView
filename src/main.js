// src/main.js — Entry point, khởi tạo theo đúng thứ tự

import { chartWrapper }    from './chart/chart.js'
import { indicatorManager } from './chart/indicators.js'
import { drawingManager }   from './chart/drawings.js'

import { Navbar }          from './ui/navbar.js'
import { Toolbar }         from './ui/toolbar.js'
import { LeftPanel }       from './ui/leftPanel.js'
import { Watchlist }       from './ui/watchlist.js'
import { IndicatorPanel }  from './ui/indicatorPanel.js'
import { SearchBar }       from './ui/searchBar.js'
import { CompareModal }    from './ui/compareModal.js'

import { startCryptoPriceFeed } from './api/coingecko.js'
import { startStockPriceFeed }  from './api/yahoo.js'

document.addEventListener('DOMContentLoaded', () => {
  // 1. Chart trước — container phải sẵn sàng
  chartWrapper.init('chart-container')
  indicatorManager.init(chartWrapper.chart)
  drawingManager.init(chartWrapper.chart)

  // 2. UI modules — mỗi class tự bindDOM + subscribe
  const navbar   = new Navbar()
  const toolbar  = new Toolbar()
  const leftPanel = new LeftPanel()
  const watchlist = new Watchlist()
  const indPanel  = new IndicatorPanel()
  const searchBar = new SearchBar()
  const compareModal = new CompareModal()

  navbar.init()
  toolbar.init()
  leftPanel.init()
  watchlist.init()
  indPanel.init()
  searchBar.init()
  compareModal.init()

  // 3. Data feeds sau cùng
  startCryptoPriceFeed()   // CoinGecko, mỗi 30s
  startStockPriceFeed()    // Yahoo Finance, mỗi 60s
})
