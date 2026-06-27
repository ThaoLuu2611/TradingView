# Requirements — ChartViewPro

A personal trading chart web app, runs locally, single user. No login, no backend.

---

## Where does the data come from?

| Data | Source |
|---|---|
| Crypto candles | Binance REST API |
| Stock candles | Yahoo Finance |
| Crypto live prices (Watchlist) | Binance REST, polled every 30s |
| Stock prices (Watchlist) | Yahoo Finance, polled every 60s (~15 min delay) |

---

## What does the interface include?

### Navbar (top bar)
- Logo + app name
- Current symbol name (e.g. BTCUSDT)
- ◆ button (asset type icon, no function)
- ＋ (circle) button → opens Compare symbols popup (UI only, no real function)
- Small ＋ button next to maximize/minimize → adds current symbol to watchlist (if not already there)
- Live price + 24h % change (green if up, red if down)
- Loading spinner while fetching
- Toast for errors (red) or success (blue)

### Toolbar (second row)
- Timeframe buttons: 1m 5m 15m 1h 4h 1D 1W (from user's pinned list)
- ∨ button → dropdown of all timeframes, click ⭐ to pin/unpin
- Candle ▾ button → choose chart type: Candlestick or Line
- Indicators button → opens indicator selection popup

### Left Panel (left column, 45px wide)
- Trendline icon → click to open submenu: Trendline, Ray, Horizontal line, Vertical line, Crossline...
- Fibonacci icon → click to open submenu: Fib Retracement, Extension, Channel, Time Zone
- Only 1 submenu open at a time
- Trash icon (bottom) → clears all drawings
- Undo (Ctrl+Z) to undo drawing steps one by one

### Main Chart (center area)
- Green / red candles based on price direction
- Volume histogram below (semi-transparent)
- OHLCV legend in the top-left corner
- Horizontal + vertical grid lines
- Price axis on the right, time axis at the bottom
- Sub-chart below (RSI, MACD...)

### Watchlist (right column)
- Crypto / Stocks tabs
- Each row: symbol name + price + % change
- Hover → shows ✕ button to remove from watchlist (saves immediately)
- Click a symbol → chart switches to that symbol
- Right-click on chart → "Add to Watchlist" or "Remove from Watchlist"

---

## Supported Indicators

| Type | Name |
|---|---|
| Overlay (drawn on candles) | MA, EMA, Bollinger Bands |
| Sub-chart | RSI (on by default), MACD, KDJ, WR, StochRSI, Cluster Algo |

---

## Symbol Search
- Filters from a fixed list (~25 Crypto + Stock symbols)
- No search API calls
- Click a result → switches chart to that symbol
- If symbol is not in watchlist → shows ＋ button to add it

---

## What is NOT included
- No dark/light mode toggle
- No orderbook, alerts, news feed, or broker features
- No login / user accounts
- Compare symbols is UI only (no real functionality)
