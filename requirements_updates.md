# TradingView Clone - Feature Updates & Requirements

Bản tài liệu này tổng hợp chi tiết các yêu cầu (requirements) và các tính năng đã được xây dựng, sửa lỗi trong phiên làm việc ngày hôm nay.

## 1. Chỉ Báo Kỹ Thuật (Indicators)

### 1.1. Stochastic RSI (StochRSI)
- **Vấn đề trước đây:** Giá trị của đường `%K` và `%D` bị báo lỗi `n/a` hoặc `NaN` khi dữ liệu nến Binance bị khuyết, chưa đóng cửa (dummy candle) khi zoom biểu đồ, hoặc thông số truyền từ giao diện bị sai kiểu dữ liệu (String thay vì Number).
- **Yêu cầu đã thực thi (Bulletproof Logic):**
  - Viết lại toàn bộ thuật toán tính toán `StochRSI` đảm bảo độ chính xác như TA-Lib.
  - Xử lý ép kiểu dữ liệu từ form UI (String) sang Number chuẩn xác.
  - Ngăn chặn triệt để hiệu ứng "lây lan NaN" (NaN Contagion): Khi một cây nến không có `close` hoặc bị rỗng, hệ thống sẽ sử dụng giá của nến liền trước, hoặc fallback về 0. Đảm bảo toàn bộ mảng dữ liệu luôn trả về con số thực.
  - Hiện tại, biểu đồ hiển thị `%K` và `%D` mượt mà, chính xác mà không gặp bất kỳ lỗi tính toán nào.

## 2. Dữ liệu & Khung Thời Gian (Timeframes)

### 2.1. Nến Tuỳ Chỉnh (Custom Timeframe Aggregation)
- **Vấn đề trước đây:** Người dùng chọn khung `3M` hoặc `5M`, dữ liệu nạp về vẫn chỉ hiển thị nến `1M`.
- **Yêu cầu đã thực thi:**
  - Bổ sung thuật toán gộp nến (Candle Aggregation).
  - Tự động lấy khung nến cơ bản `1M` từ Binance và tổng hợp lại (Math.max cho High, Math.min cho Low, và Close của nến cuối) để tạo ra các cây nến hợp lệ cho khung `3M`, `5M` hay `7M`.
  - Khung biểu đồ và nhãn Watermark tự động nhận diện và cập nhật theo khung giờ gộp mới.

## 3. Công Cụ Vẽ (Drawing Tools)

### 3.1. Fibonacci Retracement & Extension
- **Khôi phục tính năng:** Tách rời cấu hình của `FibonacciLine` và `FibonacciExtension` gốc (bị ẩn) thành một Custom Overlay chuyên biệt, đảm bảo khả năng tương thích với tính năng `Ctrl + Z` (Undo).
- **Giao Diện Màu Sắc (Pastel Theme):**
  - Xóa bỏ viền nền hiển thị văn bản (Text backgroundColor = transparent) để tránh bị khối màu xanh cứng nhắc che khuất giá trị biểu đồ.
  - Thay thế màu viền và vùng nền (Background zones) bằng chuẩn màu `RGBA`.
  - Cấu hình độ mờ (opacity) siêu nhạt cho dải nền (alpha: 0.15) và nét kẻ pastel vừa đủ nổi bật nhưng không gắt (alpha: 0.8), mang lại cảm giác mượt mà và sang trọng chuẩn TradingView Premium.

### 3.2. Chức Năng Xóa Nhanh (Floating Trash Button)
- **Vấn đề trước đây:** Thiếu nút xóa cục bộ trên màn hình cho các công cụ vẽ. Phím Delete tự nhiên của thư viện bị ẩn giấu khiến người dùng không biết cách xóa.
- **Yêu cầu đã thực thi:**
  - Nhúng (Inject) phần tử giao diện DOM `#floating-trash` chứa biểu tượng thùng rác SVG trực tiếp vào `index.html`.
  - Khai báo hàm cục bộ `window.showTrashBtnForOverlay` trong `drawings.js` để có thể nhận sự kiện từ các lớp con.
  - Tích hợp hàm bắt sự kiện `onClick` nguyên bản (Native Event) của `KLineChart v9` vào bên trong cấu hình của Custom Fibonacci.
  - Sử dụng cơ chế đo lường vị trí tuyệt đối thông qua `window.event.clientX` và `window.event.clientY` để Nút Xóa luôn hiện ra chính xác tuyệt đối tại đuôi mũi chuột bất kể khung vẽ lớn nhỏ.
  - Tích hợp logic tự động dọn dẹp và ẩn nút bấm nếu người dùng nhấp ra ngoài biểu đồ.

### 3.3. Quản Lý Drawing và Undo (Ctrl + Z)
- **Khôi phục tính năng:** Bổ sung mảng `_history` bên trong `DrawingManager` để lưu lại từng hành động thêm/xóa Overlay.
- Tính năng Undo hiện nay hoạt động ổn định trên toàn bộ các công cụ vẽ (Kể cả Trendline và Custom Fibonacci) mà không xung đột với lõi của v9.

### 3.4. Đồng Bộ Nút Bấm (Left Panel UI State)
- **Vấn đề trước đây:** Khi chọn công cụ Fibonacci, đèn xanh kích hoạt (Active State) tự động nhảy sang Trendline do sai định dạng (mismatched ID).
- **Yêu cầu đã thực thi:**
  - Đồng bộ chuẩn danh sách mã sự kiện (`subtool`) giữa DOM HTML và hàm lắng nghe sự kiện của Javascript (đổi mảng kiểm tra sang chuẩn camelCase: `fibonacciRetracement`, `fibonacciExtension`, `fibonacciChannel`, `fibonacciSpeedResistanceFan`).
  - Nút công cụ giờ đây duy trì đúng trạng thái đèn xanh khi đang vẽ Fibo.

---
*Tài liệu được cập nhật tự động. Mọi đối chiếu giữa yêu cầu và mã nguồn hiện tại đã được rà soát đồng bộ hóa.*
