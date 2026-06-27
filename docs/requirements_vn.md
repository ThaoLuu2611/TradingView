# Yêu cầu — ChartViewPro

Web app xem biểu đồ giá cá nhân, chạy local, 1 người dùng. Không đăng nhập, không backend.

---

## Dữ liệu lấy từ đâu?

| Dữ liệu | Nguồn |
|---|---|
| Nến Crypto | Binance REST API |
| Nến Cổ phiếu | Yahoo Finance |
| Giá realtime Crypto (Watchlist) | Binance REST, poll mỗi 30s |
| Giá Cổ phiếu (Watchlist) | Yahoo Finance, poll mỗi 60s (~15 phút delay) |

---

## Giao diện gồm những phần gì?

### Navbar (thanh trên cùng)
- Logo + tên app
- Tên mã đang xem (ví dụ: BTCUSDT)
- Nút ◆ (icon loại tài sản, không có chức năng)
- Nút ＋ (circle) → mở popup Compare symbols (chỉ UI, không có chức năng thật)
- Nút ＋ nhỏ bên cạnh maximize/minimize → thêm mã hiện tại vào watchlist (nếu chưa có)
- Giá realtime + % thay đổi 24h (xanh nếu tăng, đỏ nếu giảm)
- Loading spinner khi đang tải
- Toast thông báo lỗi (đỏ) hoặc thành công (xanh lam)

### Toolbar (thanh thứ 2)
- Các nút khung giờ: 1m 5m 15m 1h 4h 1D 1W (lấy từ danh sách ghim của người dùng)
- Nút ∨ → dropdown tất cả khung giờ, click ⭐ để ghim/bỏ ghim
- Nút Candle ▾ → chọn loại chart: Candlestick hoặc Line
- Nút Indicators → mở popup chọn indicator

### Left Panel (cột trái, 45px)
- Icon Trendline → click mở submenu: Trendline, Ray, Horizontal line, Vertical line, Crossline...
- Icon Fibonacci → click mở submenu: Fib Retracement, Extension, Channel, Time Zone
- Chỉ 1 submenu mở tại 1 thời điểm
- Nút thùng rác (dưới cùng) → xoá tất cả nét vẽ
- Undo (Ctrl+Z) để hoàn tác từng bước vẽ

### Chart chính (vùng giữa)
- Nến xanh / đỏ theo giá tăng giảm
- Volume histogram phía dưới (bán trong suốt)
- Legend OHLCV góc trên trái
- Grid ngang + dọc
- Trục giá bên phải, trục thời gian bên dưới
- Sub-chart phía dưới (RSI, MACD...)

### Watchlist (cột phải)
- Tab Crypto / Stocks
- Mỗi mã: tên + giá + % thay đổi
- Hover → hiện nút ✕ để xoá khỏi watchlist (tự động lưu ngay)
- Click mã → chuyển chart sang mã đó
- Chuột phải vào chart → "Add to Watchlist" hoặc "Remove from Watchlist"

---

## Indicator hỗ trợ

| Loại | Tên |
|---|---|
| Overlay (vẽ trên nến) | MA, EMA, Bollinger Bands |
| Sub-chart | RSI (mặc định bật), MACD, KDJ, WR, StochRSI, Cluster Algo |

---

## Tìm kiếm mã
- Lọc từ danh sách cố định (~25 mã Crypto + Stock)
- Không gọi API search
- Click kết quả → chuyển chart sang mã đó
- Nếu mã chưa có trong watchlist → hiện nút ＋ để thêm

---

## Những gì KHÔNG làm
- Không dark/light toggle
- Không orderbook, alerts, news, broker
- Không đăng nhập / tài khoản
- Compare symbols chỉ là UI (không có chức năng thật)
