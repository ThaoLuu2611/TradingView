# BUGS TRACKING

Tài liệu này dùng để theo dõi các lỗi (bugs) chưa được giải quyết hoặc đang cần tìm giải pháp trong tương lai.

## 1. Lỗi Đổi Màu EMA (và các built-in Indicator dạng Overlay) Không Tác Dụng
- **Trạng thái:** [ ] Chưa fix
- **Mô tả lỗi:** Khi người dùng mở Modal, đổi màu của EMA (Ví dụ đổi thành màu Xanh lam) và ấn Save, biểu đồ KLineChart không cập nhật màu sắc mà vẫn giữ nguyên màu vàng/hồng/tím cũ. Tuy nhiên, tính năng Auto-preview (real-time preview) trên Modal vẫn hoạt động với các sự kiện thay đổi dữ liệu khác.
- **Nguyên nhân dự đoán:** Lõi `KLineChart v9` đang bỏ qua thuộc tính `styles.lines` khi truyền vào hàm `createIndicator(value)` đối với các Indicator có sẵn (Built-in) như EMA khi đè lên `candle_pane`. Việc gọi hàm `removeIndicator` và `createIndicator` không ép được thư viện từ bỏ cache template màu cũ (kể cả khi đã chạy lệnh `overrideIndicator`).
- **Hướng xử lý tiếp theo:** 
  1. Thử dùng lệnh `chart.setStyles({ indicator: { EMA: { lines: [...] } } })` ở cấp độ root của biểu đồ, thay vì truyền qua parameter.
  2. Viết lại cấu hình EMA dưới dạng một *Custom Indicator* hoàn toàn mới (sử dụng `klinecharts.registerIndicator`), nhờ đó chúng ta có thể kiểm soát hoàn toàn hàm `calc` và cấy thẳng mã màu tùy chọn vào `figures`.
