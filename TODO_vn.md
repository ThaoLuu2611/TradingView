# TODO: Các tính năng tương lai

- **Tích hợp Cloud (Cơ sở dữ liệu)**
  - Cho phép người dùng kết nối tài khoản (Đăng nhập/Đăng ký).
  - Sử dụng nút "Save" (biểu tượng đám mây) trên thanh Toolbar để lưu toàn bộ cấu hình biểu đồ (Watchlist, Các chỉ báo kỹ thuật đã cài đặt, các khung giờ ưu thích) lên Cloud như Firebase, Supabase hoặc Backend riêng biệt.
  - Hỗ trợ tải lại (Đồng bộ) cấu hình khi đăng nhập trên thiết bị khác.

- **Nâng cấp tính năng Watchlist**
  - Đồng bộ danh sách theo thời gian thực (nếu tích hợp Backend).
  - Tích hợp thêm các bộ lọc hoặc sắp xếp theo mức độ biến động (% Thay đổi).

- **Biểu đồ & Các đường vẽ (Drawings)**
  - Lưu trạng thái của các đường vẽ xu hướng (Trendline) và Fibonacci lên Cloud (hiện tại có thể chỉ đang lưu Indicator và Watchlist).
  - Lưu cấu hình nhiều layout biểu đồ cho một người dùng.

- **Hiệu năng & Tối ưu**
  - Quản lý bộ nhớ tốt hơn nếu số lượng mã trong Watchlist lớn.
  - Thêm kết nối WebSocket để lấy giá realtime (thay vì polling HTTP mỗi 30s-60s như hiện tại) nhằm giảm độ trễ và đem lại cảm giác mượt mà như TradingView thật.
