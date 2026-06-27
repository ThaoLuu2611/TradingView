# Watchlist — Chi tiết yêu cầu

---

## 1. Nút Delete trên mỗi row

- Khi chuột di chuyển vào 1 row trong watchlist → **giá dịch sang phải**, xuất hiện nút **Delete (✕)** ở cuối dòng bên phải
- Không tạo khoảng trắng cố định — giá chỉ dịch sang khi hover
- Nút delete phải đủ to, nhìn rõ (không được mờ nhạt, không được nhỏ)
- Click ✕ → xoá mã khỏi watchlist + **tự động lưu ngay vào localStorage** (không cần nhấn Save)
- Lần sau vào lại web, mã đã xoá không xuất hiện lại
- Không xoá ảnh hưởng đến chart đang hiển thị

---

## 2. Thêm mã vào Watchlist

### Cách 1 — Nút ＋ trên Navbar
- Tạo icon **＋** ngay bên trái nút phóng to/thu nhỏ trên header chart
- Chỉ hiện khi mã đang xem **chưa có** trong watchlist
- Khi mã đã có trong watchlist → nút **＋ biến mất**
- Click ＋ → thêm mã vào watchlist + **tự động lưu ngay** + hiện **toast xanh lam** (success)

### Cách 2 — Chuột phải vào Chart (Context Menu)
- Chuột phải vào vùng chart → hiện context menu
- Nếu mã **chưa có** trong watchlist: hiện `Add to Watchlist`
- Nếu mã **đã có** trong watchlist: hiện `Remove from Watchlist`
- Click → thực hiện hành động + lưu ngay
- Click bên ngoài menu → đóng menu

---

## 3. Quy tắc màu Toast Notification

- ✅ **Thành công** → background **xanh lam** (success color)
- ❌ **Lỗi** → background **đỏ**
- **Tuyệt đối không dùng màu đỏ cho thông báo thành công**

---

## 4. Nguồn dữ liệu giá Watchlist

- **Crypto**: Dùng **Binance** — không dùng CoinGecko nữa
- **Stocks**: Yahoo Finance, poll mỗi 60s
