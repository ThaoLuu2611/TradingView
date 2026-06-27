# Thiết kế tổng quan — ChartViewPro

Đây là web app xem biểu đồ giá cá nhân, chạy trên máy local, không cần đăng nhập hay backend.

---

## Lấy dữ liệu từ đâu?

| Dữ liệu | Nguồn | Cách lấy |
|---|---|---|
| Nến (OHLCV) Crypto | **Binance** `api.binance.com` | REST API, mỗi lần đổi mã hoặc khung giờ |
| Nến (OHLCV) Cổ phiếu | **Yahoo Finance** | REST API, mỗi lần đổi mã hoặc khung giờ |
| Giá realtime Crypto (Watchlist) | **Binance** `/api/v3/ticker/24hr` | Poll mỗi 30 giây |
| Giá Cổ phiếu (Watchlist) | **Yahoo Finance** | Poll mỗi 60 giây, delay ~15 phút |

> Trước đây dùng CoinGecko cho giá crypto — đã bỏ hoàn toàn, thay bằng Binance.

---

## App gồm những phần gì?

```
Navbar (dòng trên cùng)
  → Hiện tên mã, giá, % thay đổi, nút Compare, ô tìm kiếm

Toolbar (dòng thứ 2)
  → Chọn khung giờ (1m, 5m... 1D, 1W), loại chart (Nến / Line)

Left Panel (cột trái)
  → Các công cụ vẽ: đường xu hướng, Fibonacci...

Chart chính (vùng giữa)
  → Biểu đồ nến do thư viện KLineCharts vẽ
  → Phía dưới là Sub-chart (RSI, MACD...)

Watchlist (cột phải)
  → Danh sách mã, hiện giá + % thay đổi realtime
  → Click vào mã → chart chuyển mã đó
```

---

## Các file code làm gì?

### API — Lấy dữ liệu
- `src/api/binance.js` — Lấy dữ liệu nến Crypto từ Binance
- `src/api/binance-feed.js` — Lấy giá realtime Crypto cho Watchlist (poll mỗi 30s)
- `src/api/yahoo.js` — Lấy dữ liệu nến + giá Cổ phiếu từ Yahoo Finance

### Chart — Vẽ biểu đồ
- `src/chart/chart.js` — Khởi tạo và điều khiển KLineCharts
- `src/chart/indicators.js` — Thêm/xoá indicator (EMA, RSI, MACD...)
- `src/chart/drawings.js` — Quản lý công cụ vẽ (trendline, Fibonacci...)

### UI — Giao diện
- `src/ui/navbar.js` — Thanh trên cùng
- `src/ui/toolbar.js` — Thanh chọn khung giờ, loại chart
- `src/ui/leftPanel.js` — Panel công cụ vẽ bên trái
- `src/ui/watchlist.js` — Danh sách mã bên phải
- `src/ui/indicatorPanel.js` — Popup bật/tắt indicator
- `src/ui/searchBar.js` — Tìm kiếm mã
- `src/ui/compareModal.js` — Popup so sánh mã

### Store — Trung tâm lưu trữ state
- `src/store/store.js` — Lưu mọi trạng thái (mã hiện tại, khung giờ, watchlist...) và làm cầu nối giữa các module
- `src/store/events.js` — Danh sách tên các sự kiện dùng trong app

---

## Các module giao tiếp nhau như thế nào?

Không module nào gọi thẳng module khác. Tất cả đều thông qua **EventBus** (store.js).

**Ví dụ:** Người dùng click BTC trong Watchlist:
1. `watchlist.js` phát sự kiện `SYMBOL_CHANGE` với giá trị `"BTCUSDT"`
2. `chart.js` nhận sự kiện → gọi Binance lấy dữ liệu nến → vẽ lại chart
3. `navbar.js` nhận sự kiện → cập nhật tên mã hiển thị
4. `watchlist.js` nhận sự kiện → highlight row BTC

**Lợi ích:** Mỗi phần không cần biết phần kia tồn tại — dễ sửa, dễ mở rộng.

---

## State lưu những gì?

| Key | Ý nghĩa | Ví dụ |
|---|---|---|
| `symbol` | Mã đang xem | `"BTCUSDT"` |
| `timeframe` | Khung giờ | `"1D"` |
| `chartType` | Loại chart | `"candle"` hoặc `"line"` |
| `watchlist` | Danh sách mã | `{ crypto: [...], stocks: [...] }` |
| `indicators` | Cấu hình indicator | `{ RSI: { enabled: true, period: 14 } }` |
| `pinnedTimeframes` | Khung giờ ghim trên toolbar | `["1m","5m","1D","1W"]` |

Dữ liệu được **lưu vào localStorage** để giữ lại khi tắt/mở lại trình duyệt: watchlist, indicator, khung giờ ghim.

---

## Thứ tự khởi động app

1. Khởi tạo Chart (phải xong trước)
2. Khởi tạo các UI module
3. Bắt đầu feed giá realtime (Binance + Yahoo)

---

## Quy tắc khi code thêm

- Không để UI gọi thẳng UI khác — dùng EventBus
- Không để UI tự gọi API — UI phát sự kiện, chart layer lo fetch
- Mọi lỗi API đều phải hiện toast thông báo cho người dùng
- Luôn có loading spinner khi đang tải dữ liệu
- Thêm tính năng mới → tạo file/class riêng, không nhồi vào file cũ
