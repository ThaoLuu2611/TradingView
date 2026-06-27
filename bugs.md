# BUGS TRACKING

Tài liệu này dùng để theo dõi các lỗi (bugs) chưa được giải quyết hoặc đang cần tìm giải pháp trong tương lai.

## 1. Lỗi Đổi Màu EMA (và các built-in Indicator dạng Overlay) Không Tác Dụng
- **Trạng thái:** [ ] Chưa fix
- **Mô tả lỗi:** Khi người dùng mở Modal, đổi màu của EMA (Ví dụ đổi thành màu Xanh lam) và ấn Save, biểu đồ KLineChart không cập nhật màu sắc mà vẫn giữ nguyên màu vàng/hồng/tím cũ. Tuy nhiên, tính năng Auto-preview (real-time preview) trên Modal vẫn hoạt động với các sự kiện thay đổi dữ liệu khác.
- **Nguyên nhân dự đoán:** Lõi `KLineChart v9` đang bỏ qua thuộc tính `styles.lines` khi truyền vào hàm `createIndicator(value)` đối với các Indicator có sẵn (Built-in) như EMA khi đè lên `candle_pane`. Việc gọi hàm `removeIndicator` và `createIndicator` không ép được thư viện từ bỏ cache template màu cũ (kể cả khi đã chạy lệnh `overrideIndicator`).
- **Hướng xử lý tiếp theo:** 
  1. Thử dùng lệnh `chart.setStyles({ indicator: { EMA: { lines: [...] } } })` ở cấp độ root của biểu đồ, thay vì truyền qua parameter.
  2. Viết lại cấu hình EMA dưới dạng một *Custom Indicator* hoàn toàn mới (sử dụng `klinecharts.registerIndicator`), nhờ đó chúng ta có thể kiểm soát hoàn toàn hàm `calc` và cấy thẳng mã màu tùy chọn vào `figures`.

---

## 2. Không tự động kéo lên/xuống chart khi mới vào app

- **Trạng thái:** [ ] Chưa fix
- **Mô tả lỗi:** Khi mới vào web, người dùng **không thể kéo chart lên/xuống** (pan dọc). Chỉ kéo được lên/xuống sau khi đã kéo vào vùng trục giá (Y-axis) trước. TradingView cho phép kéo tự do theo mọi hướng ngay từ đầu mà không cần thao tác kéo trục giá trước.
- **Nguyên nhân dự đoán:** KLineCharts v9 mặc định bật chế độ **Auto Scale** trên Y-axis, khóa chiều dọc. Người dùng phải kéo trục giá thủ công một lần để "unlock" thì mới pan dọc được. Không tìm được API public nào để tắt lock này mà không cần tương tác từ người dùng.
- **Những gì đã thử (không thành công):**
  1. Giả lập sự kiện `mousedown/mousemove/mouseup` vào vùng Y-axis để tắt auto-scale — thư viện không phản ứng với synthetic events
  2. Gọi `setStyles({ yAxis: { autoScale: false } })` — tắt auto-scale nhưng khi đổi mã giá bị lệch hoàn toàn
  3. Dùng `dispatchEvent(new MouseEvent('dblclick'))` để reset — không hoạt động
  4. Truy cập internal `_resetYAxisAutoCalcTickFlag` — không expose ra public API
- **Hướng xử lý tiếp theo:**
  1. Đọc source code KLineCharts v9 trực tiếp để tìm cách reset `autoCalcTickFlag` mà không cần recreate instance
  2. Hoặc patch thư viện nếu cần thiết

---

## 3. Khi chọn mã khác, chart bị giật/nháy trước khi hiện data mới

- **Trạng thái:** [ ] Chưa fix
- **Mô tả lỗi:** Khi người dùng click chọn một mã khác trong watchlist, chart bị **"nhảy/giật xuống" một cái** rồi mới load lại data mới. Trải nghiệm rất không mượt, không giống TradingView.
- **Nguyên nhân:** Workaround hiện tại để fix lỗi Y-axis scale (Bug #2) là `dispose()` rồi `init()` lại toàn bộ chart instance khi đổi mã. Thao tác này gây ra khoảnh khắc chart bị xoá trắng và tạo lại, tạo cảm giác giật.
- **Hướng xử lý tiếp theo:**
  1. Giải quyết được Bug #2 (tìm cách reset Y-axis mà không recreate) → Bug #3 tự hết
  2. Hoặc nếu vẫn phải recreate: dùng overlay/skeleton để che khoảnh khắc trắng trong quá trình recreate

