# Chart Interactions — Chi tiết yêu cầu

---

## 1. Di chuyển chart (Pan)

- **Trái/Phải trên vùng chart**: Kéo timeline trái/phải (pan ngang) — built-in KLineCharts
- **Lên/Xuống trên vùng chart**: Di chuyển chart lên/xuống — **phải hoạt động ngay khi mở app, không cần thao tác gì trước**
- **Lên/Xuống trên vùng trục giá (Y-axis)**: Thu/phóng thang đo giá

> ⚠️ **Bug #2 (chưa fix):** Hiện tại chỉ kéo lên/xuống được sau khi người dùng đã kéo vào vùng trục giá ít nhất 1 lần. Xem `bugs.md` để biết chi tiết.

---

## 2. Zoom trục giá (Y-axis)

- **Vuốt lên trên vùng trục giá**: Chart phóng to (price scale zoom in — khoảng giá hiển thị thu hẹp lại)
- **Vuốt xuống trên vùng trục giá**: Chart thu nhỏ (price scale zoom out — khoảng giá hiển thị mở rộng ra)

---

## 3. Zoom timeline (X-axis)

- **Scroll chuột (zoom out)**: Hiện nhiều nến hơn (phóng to view)
- **Scroll chuột (zoom in)**: Hiện ít nến hơn (thu nhỏ view)

---

## 4. Auto Scale

- Khi mới vào web hoặc đổi mã: biểu đồ **tự động** co giãn trục Y để vừa khung nến, không cần thao tác thủ công
- Double-click vào trục giá: Reset về Auto Scale

> ⚠️ **Bug #3 (chưa fix):** Khi đổi mã, chart bị giật/nháy một cái trước khi hiện data mới. Xem `bugs.md` để biết chi tiết.
