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
- **Vấn đề trước đây:** Thiếu nút xóa cục bộ trên màn hình cho các công cụ vẽ, người dùng không thể dễ dàng tắt một Fibo cụ thể.
- **Yêu cầu đã thực thi:**
  - Inject trực tiếp sự kiện `onClick` vào định nghĩa lõi của Custom Fibonacci Overlay (tương thích nguyên bản với KLineChart v9).
  - Khi click chọn vào bất kỳ đường nào của Fibonacci, một thanh công cụ nổi (Floating Delete Button - biểu tượng Thùng Rác) sẽ lập tức xuất hiện lơ lửng ngay tại vị trí mũi chuột (`window.event.clientX`).
  - Nút tự động biến mất khi người dùng nhấp ra ngoài biểu đồ, hoặc sau khi xóa thành công.

### 3.3. Đồng Bộ Nút Bấm (Left Panel UI State)
- **Vấn đề trước đây:** Khi chọn công cụ Fibonacci, đèn xanh kích hoạt (Active State) tự động nhảy sang Trendline.
- **Yêu cầu đã thực thi:**
  - Cập nhật và đồng bộ chuẩn danh sách mã sự kiện (`subtool`) giữa DOM HTML và Javascript (sử dụng chuẩn camelCase như `fibonacciRetracement`, `fibonacciExtension`).
  - Nút công cụ giờ đây duy trì đúng trạng thái kích hoạt khi làm việc với Fibonacci.

---
*Tài liệu được cập nhật tự động. Các tính năng trên đã được kiểm thử ổn định trên máy chủ nội bộ localhost.*
