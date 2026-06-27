# Architecture — ChartPro

> Vanilla JS app, không framework. Thiết kế theo **MVC + Event Bus + Module pattern**.

---

## Triết lý thiết kế

| Nguyên tắc | Cách áp dụng |
|---|---|
| **Single Responsibility** | Mỗi file chỉ làm 1 việc |
| **Separation of Concerns** | API / State / UI / Chart tách biệt hoàn toàn |
| **Event-Driven** | Module giao tiếp qua EventBus, không import trực tiếp nhau |
| **Single Source of Truth** | Store là nơi duy nhất giữ state |
| **No Magic** | Vanilla ES Modules, không build tool, không bundler |

---

## Cấu trúc thư mục

```
TradingView/
├── index.html              ← shell HTML, load modules
├── style.css               ← global styles, design tokens
├── mockup.html             ← design reference (không đụng vào)
├── requirements.md         ← đọc trước khi code
├── architecture.md         ← file này
│
└── src/
    ├── main.js             ← Entry point: khởi tạo theo thứ tự
    │
    ├── store/
    │   ├── store.js        ← Global state + pub/sub EventBus
    │   └── events.js       ← Event name constants (không hardcode string)
    │
    ├── api/
    │   ├── binance.js      ← Fetch OHLCV crypto (Binance)
    │   ├── yahoo.js        ← Fetch OHLCV stocks + giá watchlist stocks (mỗi 60s)
    │   └── coingecko.js    ← Fetch giá watchlist crypto (poll mỗi 30s)
    │
    ├── chart/
    │   ├── chart.js        ← KLineChart wrapper (init, load data, resize)
    │   ├── indicators.js   ← Thêm/xoá MA, EMA, BB, RSI, MACD, KDJ, WR
    │   └── drawings.js     ← Drawing tools (trendline, hline, fib...)
    │
    ├── ui/
    │   ├── navbar.js       ← ROW 1: symbol, giá, % change, nút ◆ ＋
    │   ├── toolbar.js      ← ROW 2: timeframe buttons + dropdown, candle type
    │   ├── leftPanel.js    ← Drawing tool icons + submenu
    │   ├── watchlist.js    ← Right panel: tabs, symbol list, click to load
    │   ├── indicatorPanel.js ← Indicator popup: toggle, period input
    │   ├── searchBar.js    ← Search input + dropdown (filter local list)
    │   └── compareModal.js ← Compare symbols popup (UI only)
    │
    └── utils/
        ├── format.js       ← formatPrice(), formatPercent(), formatDate()
        └── dom.js          ← $(), $$(), onDOM() — DOM helpers ONLY, không phải EventBus
```

---

## Luồng dữ liệu (Data Flow)

```
User Action
    │
    ▼
UI Module (e.g. watchlist.js click BTC)
    │ emit(EVENTS.SYMBOL_CHANGE, 'BTCUSDT')
    ▼
EventBus (store.js)
    │ notify all subscribers
    ├──▶ navbar.js      → cập nhật tên symbol, giá
    ├──▶ chart.js       → fetch API → load data mới
    └──▶ watchlist.js   → highlight row selected
```

> ⚠️ **Không bao giờ** để UI module gọi thẳng module khác. Tất cả đều qua EventBus.
> `emit()` và `on()` đến từ **store.js**, không phải dom.js.

---

## Store — Single Source of Truth

```js
// src/store/store.js
const state = {
  // Chart
  symbol: 'BTCUSDT',
  timeframe: '1D',
  chartType: 'candle',              // 'candle' | 'line'

  // Drawing
  activeDrawingTool: 'trendline',   // 'trendline' | 'fib' | null (mặc định active trendline)
  activeDrawingSubtool: 'trendline',// 'trendline' | 'hline' | 'hray' | 'vline' | 'crossline' | 'fib-retracement' | ...

  // Indicators
  indicators: {
    MA:   { enabled: false, period: 20, color: '#f59e0b' },
    EMA:  { enabled: false, period: 20 },
    BB:   { enabled: false, period: 20 },
    RSI:  { enabled: true,  period: 14 },
    MACD: { enabled: false },
    KDJ:  { enabled: false },
    WR:   { enabled: false, period: 14 },
  },

  // Watchlist
  activeTab: 'crypto',              // 'crypto' | 'stocks'
  watchlist: {
    crypto: ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','AVAX','DOT','MATIC','LTC','LINK','TON','NEAR','APT'],
    stocks: ['AAPL','MSFT','GOOGL','AMZN','NVDA','TSLA','META','NFLX','AMD','INTC'],
  },

  // Toolbar
  pinnedTimeframes: ['1m','5m','15m','1h','4h','1D','1W'],

  // App state
  loading: false,
  error: null,
}
```

### Store API
```js
// Những gì store.js export ra ngoài:
export function get(key)              // đọc state
export function set(key, value)       // ghi state
export function on(event, callback)   // subscribe event
export function emit(event, payload)  // publish event
```

---

## Event Constants

> Không hardcode string event. Dùng constants từ `src/store/events.js`:

```js
// src/store/events.js
export const EVENTS = {
  SYMBOL_CHANGE:     'symbol:change',    // payload: string — ví dụ 'BTCUSDT'
  TIMEFRAME_CHANGE:  'timeframe:change', // payload: string — ví dụ '1D'
  CHARTTYPE_CHANGE:  'charttype:change', // payload: string — 'candle' | 'line'
  INDICATOR_TOGGLE:  'indicator:toggle', // payload: { name: 'RSI', enabled: true }
  INDICATOR_PERIOD:  'indicator:period', // payload: { name: 'MA', period: 20 }
  DRAWING_TOOL:      'drawing:tool',     // payload: string — 'trendline' | 'fib-retracement' | ...
  DRAWING_CLEAR:     'drawing:clear',    // payload: không có
  PRICES_UPDATE:     'prices:update',    // payload: { BTC: { price, change } }
  TF_PIN_TOGGLE:     'tf:pin',           // payload: string — '1m' (toggle pin/unpin)
  LOADING:          'app:loading',      // payload: boolean
  ERROR:            'app:error',        // payload: string | null
  COMPARE_OPEN:     'compare:open',     // payload: none
  COMPARE_CLOSE:    'compare:close',    // payload: none
}
```

---

## EventBus — Subscribers

| Event | Ai emit | Ai lắng nghe |
|---|---|---|
| `SYMBOL_CHANGE` | watchlist, searchBar | chart, navbar, watchlist |
| `TIMEFRAME_CHANGE` | toolbar | chart |
| `CHARTTYPE_CHANGE` | toolbar | chart |
| `INDICATOR_TOGGLE` | indicatorPanel | indicators |
| `INDICATOR_PERIOD` | indicatorPanel | indicators |
| `DRAWING_TOOL` | leftPanel | drawings |
| `DRAWING_CLEAR` | leftPanel | drawings |
| `PRICES_UPDATE` | coingecko.js (crypto), yahoo.js (stocks) | watchlist, navbar |
| `TF_PIN_TOGGLE` | toolbar dropdown | toolbar |
| `LOADING` | chart.js | navbar (spinner) |
| `ERROR` | chart.js, api/*.js | navbar (toast) |

> ⚠️ `toolbar` KHÔNG subscribe `SYMBOL_CHANGE` — timeframe giữ nguyên khi đổi symbol.

---

## API Layer

Mỗi hàm fetch là **pure async function**, không biết về UI. Ngoại lệ: `coingecko.js` import `emit` từ store để push giá định kỳ.

```js
// src/api/binance.js
export async function fetchOHLCV(symbol, interval, limit = 500) { ... }
// returns: [{ timestamp, open, high, low, close, volume }, ...]

// src/api/yahoo.js
export async function fetchStockOHLCV(ticker, interval) { ... }
// returns: same format
export async function fetchStockPrice(ticker) { ... }
// returns: { price: 189.5, change: 1.23 }

// src/api/coingecko.js — import emit từ store để push PRICES_UPDATE
// ⚠️ Free tier: 10-30 req/min → poll mỗi 30s, KHÔNG 10s
export async function fetchPrices(symbols) { ... }
// returns: { BTC: { price: 94250, change: 2.34 }, ... }
export function startPriceFeed() { ... }
// set Interval 30000ms → gọi fetchPrices() → emit(EVENTS.PRICES_UPDATE, data)
```

**Error handling bắt buộc trong mọi API call:**
```js
import { emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'

try {
  emit(EVENTS.LOADING, true)
  const data = await fetchOHLCV(...)
  // xử lý data
  emit(EVENTS.LOADING, false)
} catch (err) {
  emit(EVENTS.LOADING, false)
  emit(EVENTS.ERROR, 'Không tải được dữ liệu. Thử lại sau.')
}
```

---

## Chart Layer

```js
// src/chart/chart.js — wrapper KLineChart, không biết gì về UI
import { on, get } from '../store/store.js'
import { EVENTS } from '../store/events.js'

export function initChart(containerId) {
  // khởi tạo KLineChart
  // tự subscribe events:
  on(EVENTS.SYMBOL_CHANGE,    (symbol) => reloadData(symbol, get('timeframe')))
  on(EVENTS.TIMEFRAME_CHANGE, (tf) => reloadData(get('symbol'), tf))
  on(EVENTS.CHARTTYPE_CHANGE, (type) => setChartType(type))
}
export function loadData(klineData) { ... }
export function setChartType(type) { ... }  // 'candle' | 'line'
export function resize() { ... }

// src/chart/indicators.js
export function addIndicator(name, options) { ... }
export function removeIndicator(name) { ... }
export function updateIndicatorPeriod(name, period) { ... }

// src/chart/drawings.js
export function setDrawingMode(subtool) { ... }  // 'trendline' | 'hline' | ...
export function clearAll() { ... }
```

---

## UI Layer

Mỗi UI module là **1 class**, chức năng nào riêng thì class riêng:

```js
// src/ui/navbar.js
import { on, emit } from '../store/store.js'
import { EVENTS } from '../store/events.js'
import { formatPrice, formatPercent } from '../utils/format.js'

export class Navbar {
  constructor() {
    this._el       = null
    this._symName  = null
    this._price    = null
    this._change   = null
    this._spinner  = null
  }

  init() {
    this._bindDOM()
    this._bindEvents()
    this._subscribe()
  }

  _bindDOM() {
    this._symName = document.getElementById('sym-name')
    this._price   = document.getElementById('sym-price')
    this._change  = document.getElementById('sym-change')
    this._spinner = document.getElementById('nav-spinner')
  }

  _bindEvents() {
    document.getElementById('btn-compare')
      .addEventListener('click', () => emit(EVENTS.COMPARE_OPEN))
  }

  _subscribe() {
    on(EVENTS.SYMBOL_CHANGE, (sym) => { this._symName.textContent = sym })
    on(EVENTS.PRICES_UPDATE, (data) => this._updatePrice(data))
    on(EVENTS.LOADING,       (v)    => this._spinner.classList.toggle('show', v))
    on(EVENTS.ERROR,         (msg)  => this._showToast(msg))
  }

  _updatePrice(data) { /* ... */ }
  _showToast(msg)    { /* ... */ }
}
```

**Nguyên tắc chia class:**
| Class | File | Chức năng |
|---|---|---|
| `Navbar` | `ui/navbar.js` | Hiển thị symbol, giá, spinner, toast |
| `Toolbar` | `ui/toolbar.js` | Timeframe buttons, candle type dropdown |
| `TimeframeDrop` | `ui/toolbar.js` | Dropdown timeframe đầy đủ (class riêng trong cùng file) |
| `LeftPanel` | `ui/leftPanel.js` | Drawing tool buttons |
| `TrendSubmenu` | `ui/leftPanel.js` | Submenu trendline (class riêng trong cùng file) |
| `FibSubmenu` | `ui/leftPanel.js` | Submenu fibonacci |
| `Watchlist` | `ui/watchlist.js` | Tab + danh sách symbol + giá |
| `IndicatorPanel` | `ui/indicatorPanel.js` | Popup indicators |
| `SearchBar` | `ui/searchBar.js` | Input + dropdown results |
| `CompareModal` | `ui/compareModal.js` | Popup compare symbols |
| `KLineChartWrapper` | `chart/chart.js` | Wrap KLineChart |
| `IndicatorManager` | `chart/indicators.js` | Quản lý add/remove indicators |
| `DrawingManager` | `chart/drawings.js` | Quản lý drawing tools |

---

## Entry Point — Thứ tự init quan trọng

```js
// src/main.js
document.addEventListener('DOMContentLoaded', () => {
  // 1. Chart trước (container phải sẵn sàng)
  initChart('chart-container')

  // 2. UI sau
  initNavbar()
  initToolbar()
  initLeft()
  initWatchlist()
  initSearch()
  initIndPanel()
  initCompare()

  // 3. Data feed sau cùng
  startCryptoPriceFeed()  // CoinGecko, poll mỗi 30s
  startStockPriceFeed()   // Yahoo Finance, poll mỗi 60s
})
```

---

## index.html Shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>ChartPro</title>
  <link rel="stylesheet" href="style.css"/>
</head>
<body>
  <div id="app">
    <div id="navbar"></div>
    <div id="toolbar"></div>
    <div id="body">
      <div id="left-panel"></div>
      <div id="chart-wrap">
        <div id="chart-container"></div>  <!-- KLineChart mount here -->
        <div id="sub-chart"></div>
      </div>
      <div id="right-panel"></div>
    </div>
  </div>
  <!-- Dùng type="module" → ES Modules native, không cần webpack/vite -->
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

---

## Quy tắc khi code

1. **Không import UI từ UI** — chỉ giao tiếp qua EventBus
2. **Không gọi API từ UI** — UI emit event, chart layer lo fetch
3. **Không hardcode string event** — dùng `EVENTS` constants từ `events.js`
4. **Mọi lỗi API phải emit `EVENTS.ERROR`** — để navbar có thể nghe và hiển thị toast
5. **Loading state** — emit `EVENTS.LOADING, true` trước fetch, `false` sau fetch
6. **Mỗi function < 30 dòng** — nếu dài hơn thì tách hàm
7. **Mỗi chức năng riêng = 1 class riêng** — đừng nhồi nhiều chức năng vào 1 class/function
8. **Không thêm tính năng ngoài requirements.md**

---

## Scale sau này

| Muốn thêm | Làm gì |
|---|---|
| Dark mode | CSS variables trong style.css, toggle class `dark` trên `<body>` |
| Thêm exchange | Thêm `src/api/bybit.js`, không đụng code cũ |
| Thêm drawing tool | Thêm subtool vào `drawings.js` + item vào `leftPanel.js` |
| Thêm indicator | Thêm vào `indicators.js` + row trong `indicatorPanel.js` |
| Panel resize | Thêm `src/ui/layout.js` quản lý drag resize |
| Persist settings | `localStorage` trong store.js (pinnedTimeframes, indicators) |

## Mobile Support (Responsive UI)

Mô hình thiết kế giao diện di động được chia thành 2 file chính để không ảnh hưởng đến logic desktop:
- **`mobile.css`**: Nạp *sau cùng* trong `index.html` để override (ghi đè) các style tĩnh (flex-direction, positions, z-index).
- **`mobile.js`**: Hook vào resize sự kiện để quyết định đóng/mở panel qua class `.open` thay vì đổi style inline.

**Cách hoạt động của Mobile UI:**
1. **Watchlist Panel:** Chuyển thành Side Drawer trượt từ bên phải sang (width: 60%). 
2. **Drawing Toolbar:** Chuyển thành Bottom Sheet (nằm dưới đáy, flex-direction: row, wrap). Nút "Drawing" được thiết kế dạng Floating Action Button (FAB) góc dưới phải. Khi FAB click, bottom sheet trồi lên. Các submenu của Drawing Toolbar được ép bung ngược lên trên thay vì bung ngang để tránh lọt khỏi màn hình.
3. **Crosshair & Overlay points:** Được thiết kế tối ưu chạm (touch), các nút mỏ neo (anchor points) khi vẽ nét đứt/liền được set styles nét, nhỏ gọn trắng-xanh chuẩn UI gốc.
4. **Delete Drawings:** Do mobile không có phím Delete/Backspace, logic xoá được tích hợp vào icon Thùng Rác: Nếu 1 nét vẽ (overlay) đang được chọn (active), ấn thùng rác sẽ chỉ xoá nét đó; nếu không chọn nét nào, ấn thùng rác sẽ xoá toàn bộ biểu đồ.
