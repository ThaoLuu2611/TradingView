// src/main.js — Entry point, khởi tạo theo đúng thứ tự

import { chartWrapper }    from './chart/chart.js'
import { indicatorManager } from './chart/indicators.js'
import { drawingManager }   from './chart/drawings.js'
import { paneControlManager } from './ui/paneControls.js'

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
  
  // Attach Pane Controls before indicators so they can use it
  paneControlManager.init(chartWrapper.chart)
  
  indicatorManager.init(chartWrapper.chart, paneControlManager)
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

  // 4. Panel Resizer
  const resizer = document.getElementById('rp-resizer')
  const rightPanel = document.getElementById('right-panel')
  if (resizer && rightPanel) {
    let isResizing = false
    let startX = 0
    let startWidth = 0

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true
      startX = e.clientX
      startWidth = parseInt(document.defaultView.getComputedStyle(rightPanel).width, 10)
      document.body.style.cursor = 'col-resize'
    })

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return
      const diff = startX - e.clientX
      let newWidth = startWidth + diff
      if (newWidth < 150) newWidth = 150
      if (newWidth > 500) newWidth = 500
      rightPanel.style.width = newWidth + 'px'
      // KLineChart needs to resize
      chartWrapper.resize()
    })

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false
        document.body.style.cursor = ''
      }
    })
  }
})
