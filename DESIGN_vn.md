# Hướng Dẫn Thiết Kế (Design Guidelines)

## 1. Nguyên Tắc UI/UX
- **Thẩm mỹ (Aesthetics)**: Sử dụng giao diện hiện đại, tối giản, lấy cảm hứng từ TradingView.
- **Màu sắc**:
  - Nền (Background): Trắng/Xám nhạt (`#f0f3fa` cho toolbar, `#ffffff` cho vùng chính).
  - Chữ (Text): Tối màu/Slate cho chữ chính (`#131722`), xám cho chữ phụ (`#787b86`).
  - Icon: Xám đậm (`#434651`) ở trạng thái mặc định.

## 2. Thông Báo (Toast Notifications)
Màu sắc của các popup thông báo phải tuân thủ chuẩn sau:
- **Lỗi (Error)**: Nền đỏ (`#ef5350`), chữ trắng.
- **Thành công (Success/OK)**: Nền xanh lam (`#2962ff`), chữ trắng.
- **Cảnh báo / Thông tin (Warning/Info)**: Nền vàng (`#ffb74d`), chữ đen (`#131722`) để tương phản tốt.
- **Vị trí hiển thị**: Luôn hiển thị ở **chính giữa sát mép trên** màn hình (`top: 10px`), thay vì dưới đáy màn hình.

## 3. Typography (Kiểu chữ)
- **Font Family**: Dùng 'Inter', sans-serif cho văn bản thường. Dùng 'JetBrains Mono' cho các con số, giá cả, và thông số kỹ thuật.
- **Kích thước chữ (Font Sizes)**: Chữ cơ bản là `14px`. Các thông số trên biểu đồ (OHLCV) dùng `14px` và nét thường (`weight: 'normal'`) để mảnh và không bị béo, đảm bảo dễ nhìn so với tên mã (Symbol).
