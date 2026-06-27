# Lỗi đang theo dõi — ChartViewPro

Danh sách các lỗi chưa được giải quyết, kèm những gì đã thử và hướng xử lý tiếp theo.

---

## Bug 1 — Đổi màu EMA không tác dụng

**Mô tả:** Người dùng đổi màu EMA trong popup Indicator rồi Save, nhưng biểu đồ không cập nhật màu — vẫn giữ màu cũ.

**Nguyên nhân dự đoán:** KLineCharts v9 bỏ qua thuộc tính `styles.lines` khi truyền vào `createIndicator()` cho các indicator built-in (EMA, MA...). Gọi `removeIndicator` + `createIndicator` lại cũng không ép được thư viện cập nhật màu.

**Đã thử:**
- Dùng `overrideIndicator()` — không hoạt động
- Remove rồi add lại — không hoạt động

**Hướng fix tiếp theo:**
1. Dùng `chart.setStyles({ indicator: { EMA: { lines: [...] } } })` ở root
2. Viết lại EMA thành Custom Indicator (`registerIndicator`) để kiểm soát hoàn toàn màu sắc

---

## Bug 2 — Không kéo chart lên/xuống được khi mới vào app

**Mô tả:** Khi mới mở app, người dùng không thể kéo chart lên/xuống (pan dọc). Chỉ kéo được sau khi đã kéo vào vùng trục giá (Y-axis) ít nhất 1 lần. TradingView cho phép kéo tự do mọi hướng ngay từ đầu.

**Nguyên nhân:** KLineCharts v9 mặc định bật Auto Scale trên Y-axis, khoá chiều dọc lại. Người dùng phải kéo trục giá thủ công một lần để "mở khoá". Không tìm được API public nào để tắt khoá này mà không cần thao tác từ người dùng.

**Đã thử (đều không thành công):**
1. Giả lập sự kiện `mousedown/mousemove/mouseup` lên Y-axis — thư viện không phản ứng với synthetic events
2. `setStyles({ yAxis: { autoScale: false } })` — tắt được khoá dọc nhưng Y-axis bị kẹt ở range cũ, đổi mã thì chart trắng xoá
3. `dispatchEvent(new MouseEvent('dblclick'))` để reset — không hoạt động
4. Truy cập internal `_resetYAxisAutoCalcTickFlag` — không được expose ra public API

**Hướng fix tiếp theo:**
1. Đọc source code KLineCharts v9 để tìm cách reset `autoCalcTickFlag` mà không recreate instance
2. Hoặc patch thư viện nếu cần

---

## Bug 3 — Chart bị giật khi đổi mã

**Mô tả:** Khi click chọn mã khác trong watchlist, chart bị giật/nháy một cái rồi mới hiện data mới. Không mượt, không giống TradingView.

**Nguyên nhân:** Workaround hiện tại cho Bug 2 là `dispose()` rồi `init()` lại toàn bộ chart instance khi đổi mã. Thao tác này gây ra khoảnh khắc chart trắng rồi tạo lại.

**Hướng fix tiếp theo:**
1. Fix được Bug 2 (reset Y-axis mà không recreate) → Bug 3 tự hết
2. Hoặc nếu vẫn phải recreate: dùng overlay/skeleton che khoảnh khắc trắng trong lúc recreate
