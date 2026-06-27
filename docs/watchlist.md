# Watchlist — Chi tiết Yêu cầu

> File này mô tả chi tiết hơn `requirements.md` cho tính năng Watchlist.

---

## 1. Xoá mã khỏi Watchlist

### Hành vi
- Hover vào row bất kỳ trong watchlist → xuất hiện nút **✕** ở cuối bên phải row đó
- Click **✕** → xoá mã ra khỏi danh sách
- **Tự động lưu ngay lập tức** vào `localStorage` — không cần nhấn nút Save
- Lần sau vào lại web, mã đã xoá **không xuất hiện lại**

### UI
- Nút ✕ nhỏ, chỉ hiện khi hover (không chiếm diện tích khi không hover)
- Nút ✕ đủ lớn để bấm dễ (min 24×24px)
- Không có confirm dialog — xoá ngay

### Lưu ý
- Chỉ xoá khỏi watchlist, **không** xoá mã khỏi chart hiện tại
- Nếu đang xem mã đó, chart vẫn tiếp tục hiển thị bình thường

---

## 2. Thêm mã vào Watchlist

### Cách 1 — Nút ＋ trên Navbar

- Nút **＋** nhỏ xuất hiện **bên trái nút phóng to/thu nhỏ** trên header chart
- Chỉ hiện khi mã đang xem **chưa có** trong watchlist
- Tự động **ẩn** khi mã đó đã có trong watchlist (icon biến mất hoàn toàn)
- Click → thêm mã vào watchlist + lưu ngay + hiện **toast xanh lam** thành công
- Animation: icon "bay" vào phía watchlist (hiệu ứng trang trí, không bắt buộc)

### Cách 2 — Context Menu (chuột phải vào Chart)

- Click chuột phải vào vùng chart → xuất hiện context menu nhỏ
- Menu hiển thị nội dung phụ thuộc vào trạng thái watchlist:
  - Nếu mã **chưa có** trong watchlist: `Add to Watchlist`
  - Nếu mã **đã có** trong watchlist: `Remove from Watchlist`
- Click "Add to Watchlist" → thêm vào + **toast xanh lam**
- Click "Remove from Watchlist" → xoá ra + lưu ngay
- Click bên ngoài menu → đóng menu

### Toast Notification
- ✅ Thành công: **background xanh lam** (`#2962ff` hoặc `#26a69a`)
- ❌ Lỗi: **background đỏ** (`#ef5350`)
- **Quy tắc màu sắc quan trọng**: Chỉ dùng đỏ cho lỗi. Thành công luôn luôn dùng xanh.

---

## 3. Cập nhật giá Watchlist

### Crypto
- Nguồn: **Binance REST API** `/api/v3/ticker/24hr` — poll mỗi **30 giây**
- ~~CoinGecko~~ — đã bị loại bỏ hoàn toàn
- Hiển thị: Giá hiện tại + % thay đổi 24h

### Stocks
- Nguồn: **Yahoo Finance** `quote` endpoint — poll mỗi **60 giây**
- Delay tối đa ~15 phút (chấp nhận được cho personal use)

---

## 4. Danh sách mặc định

### Crypto tab
`BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, DOT, MATIC, LTC, LINK, TON, NEAR, APT`

### Stocks tab
`AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, AMD, INTC`

---

## 5. Persistence (Lưu trữ)

- Lưu vào `localStorage` key `watchlist`
- Cấu trúc: `{ crypto: string[], stocks: string[] }`
- Mọi thao tác thêm/xoá đều **auto-save ngay**, không cần action của user
