# Requirements — Chart cá nhân

> ⚠️ **ĐỌC FILE NÀY + XEM mockup.html TRƯỚC KHI CODE**

## Mục đích
Web app xem chart cá nhân, 1 người dùng, chạy local. Không login, không backend.

---

## Tech Stack
- HTML + CSS + JS (vanilla ES Modules, không framework, không bundler)
- **KLineChart** — CDN `https://unpkg.com/klinecharts/dist/klinecharts.min.js`
- Chạy local: `python3 -m http.server 8080` (chỉ để serve file tĩnh)

---

## Data (Free, không cần key)
| API | Dùng cho | Ghi chú |
|---|---|---|
| Binance `api.binance.com` | Crypto OHLCV + watchlist giá dự phòng | Không cần key |
| Yahoo Finance `query1.finance.yahoo.com` | Stock OHLCV + watchlist giá stocks (mỗi 60s) | Không cần key, delay ~15 phút |
| CoinGecko `api.coingecko.com` | Giá watchlist crypto (mỗi 30s) | Free: 10-30 req/min |

---

## Layout
```
┌──────────────────────────────────────────────────────────┐
│  ROW 1 (navbar):  Logo │ Symbol ◆ ＋ │ Giá │ %Change    │
├──────────────────────────────────────────────────────────┤
│  ROW 2 (toolbar): [1m 5m...1W ∨] [🕯▾] [📈] │ [🔍 ...]  │
├───────┬──────────────────────────────────────┬───────────┤
│       │                                      │           │
│ LEFT  │       CHART CHÍNH (nến + volume)     │  RIGHT    │
│ PANEL │                                      │  PANEL    │
│       ├──────────────────────────────────────┤ Watchlist │
│       │      SUB-CHART (RSI / MACD / ...)    │           │
└───────┴──────────────────────────────────────┴───────────┘
```

---

## Chi tiết từng vùng

### ROW 1 — Navbar
- [ ] Logo + tên app (ChartPro)
- [ ] Symbol hiện tại (BTCUSDT)
- [ ] Nút **◆** — icon crypto/stock type (không có chức năng)
- [ ] Nút **＋** (circle) → popup **"Compare symbols"**
  - Search box (placeholder: "Symbol, ISIN, or CUSIP")
  - Danh sách recent symbols (scrollable, fixed height)
  - Hover row → hiện 3 nút: `Same % scale` | `New price scale` | `New pane`
  - ⚠️ 3 nút trên chỉ **đóng modal**, không có chức năng thật
  - Click overlay ngoài → đóng
- [ ] Giá hiện tại (realtime, font JetBrains Mono)
- [ ] % thay đổi 24h — xanh `#26a69a` nếu dương, đỏ `#ef5350` nếu âm
- [ ] Loading spinner nhỏ khi đang fetch (thay giá)
- [ ] Toast error nếu API lỗi

### ROW 2 — Toolbar
- [ ] Timeframe shortcuts (render từ `pinnedTimeframes` trong store):
  - Default: `1m` `5m` `15m` `1h` `4h` `1D` `1W`
  - Active timeframe → blue background
- [ ] Nút `∨` → dropdown timeframe đầy đủ:
  - Header: `+ Add custom interval` — **chỉ là UI placeholder, chưa implement**
  - Sections: TICKS / SECONDS / MINUTES / HOURS / DAYS / WEEKS / MONTHS
  - Mỗi item: tên timeframe bên trái + ⭐ bên phải
  - Click ⭐ → toggle pin/unpin (thêm/xoá khỏi toolbar shortcuts)
  - Click item → chọn timeframe đó + đóng dropdown
  - Dropdown scroll được
  - Click ngoài → đóng
- [ ] `🕯 Candle ▾` → dropdown nhỏ chọn chart type:
  - `Candlestick` (mặc định, có dấu ✓)
  - `Line`
  - Click ngoài → đóng
- [ ] `📈 Indicators` → mở Indicator panel popup
- [ ] `🔍 Search symbol...` (input, bên phải) → dropdown results:
  - **Không gọi API search** — filter từ danh sách cố định (`SYMBOL_LIST` trong store)
  - `SYMBOL_LIST` gồm: 15 crypto symbols + 10 stock symbols (hardcode, không thay đổi)
  - Section CRYPTO: 15 symbols
  - Section STOCKS: 10 symbols
  - Badge màu: CRYPTO (blue) / STOCK (green)
  - Click item → `EVENTS.SYMBOL_CHANGE` → đóng dropdown

### Left Panel (45px wide)
- [ ] **Trendline** icon (default active, blue bg) → click toggle submenu:
  - **Lines:** Trendline ✓, Ray, Horizontal line, Horizontal ray, Vertical line, Crossline
  - **Channels:** Parallel channel, Regression trend
  - Click item trong submenu → chọn subtool đó, đóng submenu
- [ ] **Fibonacci** icon → click toggle submenu:
  - Fib Retracement ✓, Fib Extension, Fib Channel, Fib Time Zone
  - Click item → chọn subtool đó
- [ ] **Trash** icon (bottom) → `EVENTS.DRAWING_CLEAR` → xoá tất cả drawings
- [ ] Chỉ 1 submenu mở tại 1 thời điểm
- [ ] Click ngoài left panel → đóng submenu

### Chart chính
- [ ] Nến xanh `#26a69a` / đỏ `#ef5350`
- [ ] Volume histogram dưới (15% height, semi-transparent)
- [ ] OHLCV legend top-left: O H L C + delta + %
- [ ] Grid ngang + dọc màu `#f0f3fa`
- [ ] Price axis phải, Time axis dưới
- [ ] Zoom scroll, pan kéo thả (KLineChart built-in)
- [ ] Crosshair khi hover (KLineChart built-in)
- [ ] Resize tự động khi window resize

### Indicator Panel (popup overlay, click ngoài đóng)
- [ ] Search box filter indicators
- [ ] **OVERLAY** (render trên chart chính):
  - MA — checkbox + period input + color dot + remove btn
  - EMA — checkbox + period input
  - Bollinger Bands — checkbox + period input
- [ ] **SUB-CHART** (pane dưới chart):
  - RSI — checkbox + period input + remove btn (default: ON, period 14)
  - MACD — checkbox
  - KDJ — checkbox
  - WR — checkbox + period input
- [ ] Checkbox bật → period input enabled, có remove btn
- [ ] Checkbox tắt → period input disabled (grayed)

### Sub-chart (RSI mặc định)
- [ ] Cao ~120px, border-top tách chart chính
- [ ] Label `RSI · 14` top-left (màu purple)
- [ ] Đường purple `#9c27b0`
- [ ] Dashed line 70 (đỏ nhạt) + band vùng overbought tô nhẹ
- [ ] Dashed line 30 (xanh nhạt) + band vùng oversold tô nhẹ

### Right Panel — Watchlist (200px)
- [ ] Header "Watchlist" + gear icon (gear không có chức năng)
- [ ] Tab `Crypto` (default) / `Stocks`
- [ ] Mỗi row: [Symbol bold] [Price mono] [% change xanh/đỏ]
- [ ] Row đang xem → highlight (selected state)
- [ ] Click row → `EVENTS.SYMBOL_CHANGE`
- [ ] **Crypto:** BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, DOT, MATIC, LTC, LINK, TON, NEAR, APT
- [ ] **Stocks:** AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, AMD, INTC
- [ ] Giá + % cập nhật định kỳ:
  - **Crypto**: CoinGecko API, mỗi 30s
  - **Stocks**: Yahoo Finance `quote` endpoint, mỗi 60s
  - ⚠️ Yahoo Finance không hỗ trợ realtime — giá stocks có thể delay 15 phút (chấp nhận được cho personal use)

---

## Không làm
- ❌ Dark/Light toggle (chỉ light theme)
- ❌ Orderbook / Depth chart
- ❌ Alerts / Notifications
- ❌ News feed
- ❌ Broker / giao dịch / buy/sell
- ❌ Login / user account
- ❌ Compare symbols thực sự (chỉ UI popup)
- ❌ Custom interval thực sự (chỉ UI placeholder)
- ❌ Ticks / Seconds timeframe thật (dropdown có hiển thị UI nhưng không hoạt động — Binance/Yahoo không hỗ trợ tick data miễn phí)
- ❌ Multi-pane layout thật (New pane button chỉ đóng modal)

---

## File
```
├── requirements.md       ← đọc trước
├── architecture.md       ← kiến trúc code
├── mockup.html           ← design reference
├── index.html            ← app thật
├── style.css             ← tất cả styles
└── src/
    ├── main.js
    ├── store/
    │   ├── store.js
    │   └── events.js
    ├── api/
    ├── chart/
    ├── ui/
    └── utils/
```

---

## Màu sắc & Font

| Token | Giá trị |
|---|---|
| Primary | `#2962ff` |
| Green (up) | `#26a69a` |
| Red (down) | `#ef5350` |
| RSI purple | `#9c27b0` |
| MA yellow | `#f59e0b` |
| Border | `#e0e3eb` |
| Panel bg | `#f0f3fa` |
| Text main | `#131722` |
| Text muted | `#787b86` |

| Font | Dùng cho |
|---|---|
| Inter | UI text, labels, buttons |
| JetBrains Mono | Giá, %, OHLCV, timestamps |
