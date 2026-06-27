# Danh sách Lỗi (Bugs) cần xử lý khi Migrate KLineChart v10
*Ngày ghi nhận: 28/06/2026*

## 1. Lỗi lặp lại data trên biểu đồ vô tận (Data Duplication / Infinite Loop)
- **Triệu chứng:** Khi cuộn biểu đồ (đặc biệt là cuộn sang phải / zoom out), dữ liệu thời gian bị nối đuôi lặp lại vô tận.
- **Nguyên nhân tiềm năng:** Cơ chế `DataLoader` (`getBars`) của v10. Dù đã xử lý chặn `forward` và chặn race condition, khả năng do bộ cache trình duyệt quá mạnh hoặc KLineChart vẫn gọi 1 hàm nào đó để auto-merge data.

## 2. Lỗi nhân đôi Indicator khi chuyển mã (Duplicate Indicators)
- **Triệu chứng:** Khi click chọn mã khác trên Watchlist (Panel phải), các indicator ở dưới (RSI, MACD, v.v.) tự động sinh ra thêm bản sao ở các pane mới.
- **Nguyên nhân tiềm năng:** Sự kiện `CHART_READY` nổ lại khi chuyển mã khiến hàm `_initFromStore` chạy lại và gọi lệnh `add()` đẻ thêm pane thay vì đè lên pane cũ.

## 3. Mất các nút chức năng UI trên Chart và Indicator (Missing Pane Controls)
- **Triệu chứng:** Các tính năng UI ở branch `develop` bị mất hoàn toàn trên v10. Cụ thể mất nút phóng to / thu nhỏ ở chart chính; và mất các nút: Phóng to / Thu nhỏ, Ẩn/Hiện, Xóa, Cài đặt ở các Indicator.
- **Nguyên nhân tiềm năng:** KLineChart v10 đã thay đổi hoàn toàn cấu trúc DOM và class CSS bên trong canvas container. `src/ui/paneControls.js` đang tìm theo class của v9 nên thất bại, không đính kèm được các nút UI HTML lên được.

---
**Hướng giải quyết cho ngày mai:**
1. **Mất UI Controls:** Mở DevTools soi lại cấu trúc DOM của KLineChart v10, viết lại hàm query element DOM trong `paneControls.js`.
2. **Xử lý dứt điểm Duplicate:** Xem lại hàm khởi tạo `add()`, test kỹ `overrideIndicator`.
3. **Debug Data Loop:** Nếu không thể dùng DataLoader, đổi chiến thuật sang dùng `applyNewData` thủ công.
