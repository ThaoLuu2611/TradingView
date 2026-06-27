# Architecture Overview — ChartViewPro

This is a personal trading chart web app that runs locally. No login, no backend required.

---

## Where does the data come from?

| Data | Source | How |
|---|---|---|
| Crypto candle data (OHLCV) | **Binance** `api.binance.com` | REST API, fetched each time symbol or timeframe changes |
| Stock candle data (OHLCV) | **Yahoo Finance** | REST API, fetched each time symbol or timeframe changes |
| Crypto live prices (Watchlist) | **Binance** `/api/v3/ticker/24hr` | Polled every 30 seconds |
| Stock prices (Watchlist) | **Yahoo Finance** | Polled every 60 seconds, ~15 min delay |

> CoinGecko was previously used for crypto prices — it has been fully removed and replaced with Binance.

---

## What are the main parts of the app?

```
Navbar (top bar)
  → Shows current symbol, price, % change, Compare button, search box

Toolbar (second row)
  → Timeframe selector (1m, 5m... 1D, 1W), chart type (Candle / Line)

Left Panel (left column)
  → Drawing tools: trendline, Fibonacci...

Main Chart (center)
  → Candlestick chart powered by the KLineCharts library
  → Sub-chart below (RSI, MACD...)

Watchlist (right column)
  → List of symbols with live price + % change
  → Click a symbol → chart switches to that symbol
```

---

## What does each file do?

### API — Fetching data
- `src/api/binance.js` — Fetches crypto candle data from Binance
- `src/api/binance-feed.js` — Fetches live crypto prices for the Watchlist (polls every 30s)
- `src/api/yahoo.js` — Fetches stock candle data + prices from Yahoo Finance

### Chart — Drawing the chart
- `src/chart/chart.js` — Initializes and controls KLineCharts
- `src/chart/indicators.js` — Adds/removes indicators (EMA, RSI, MACD...)
- `src/chart/drawings.js` — Manages drawing tools (trendline, Fibonacci...)

### UI — The interface
- `src/ui/navbar.js` — Top bar
- `src/ui/toolbar.js` — Timeframe and chart type controls
- `src/ui/leftPanel.js` — Drawing tool panel on the left
- `src/ui/watchlist.js` — Symbol list on the right
- `src/ui/indicatorPanel.js` — Popup to toggle indicators
- `src/ui/searchBar.js` — Symbol search
- `src/ui/compareModal.js` — Compare symbols popup

### Store — Central state management
- `src/store/store.js` — Stores all app state (current symbol, timeframe, watchlist...) and acts as a message bus between modules
- `src/store/events.js` — List of event names used across the app

---

## How do modules talk to each other?

No module calls another module directly. Everything goes through an **EventBus** (store.js).

**Example:** User clicks BTC in the Watchlist:
1. `watchlist.js` fires a `SYMBOL_CHANGE` event with value `"BTCUSDT"`
2. `chart.js` receives it → calls Binance API → redraws the chart
3. `navbar.js` receives it → updates the displayed symbol name
4. `watchlist.js` receives it → highlights the BTC row

**Why this matters:** Each module doesn't need to know the others exist — easier to modify and extend.

---

## What does the state store?

| Key | Meaning | Example |
|---|---|---|
| `symbol` | Currently viewed symbol | `"BTCUSDT"` |
| `timeframe` | Current timeframe | `"1D"` |
| `chartType` | Chart style | `"candle"` or `"line"` |
| `watchlist` | List of saved symbols | `{ crypto: [...], stocks: [...] }` |
| `indicators` | Indicator configuration | `{ RSI: { enabled: true, period: 14 } }` |
| `pinnedTimeframes` | Timeframes pinned to toolbar | `["1m","5m","1D","1W"]` |

The watchlist, indicator settings, and pinned timeframes are **saved to localStorage** so they persist across browser sessions.

---

## App startup order

1. Initialize the Chart first (must be ready before everything else)
2. Initialize all UI modules
3. Start the live price feeds (Binance + Yahoo)

---

## Rules when adding new code

- UI modules must not call each other directly — use the EventBus
- UI must not call the API directly — emit an event and let the chart layer handle fetching
- All API errors must show a toast notification to the user
- Always show a loading spinner while fetching data
- New features go in new files/classes — don't stuff things into existing ones
