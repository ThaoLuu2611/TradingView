# Quy Trình Git & Deploy (Git Workflow)

Tài liệu này quy định chuẩn quy trình quản lý mã nguồn (Git) và triển khai (Deploy) cho dự án ChartViewPro. Mọi quá trình phát triển tính năng mới đều phải tuân thủ nghiêm ngặt quy trình này.

## 1. Môi trường các nhánh (Branches)
- `main`: Nhánh gốc (Production). Mã nguồn trên nhánh này luôn phải là bản ổn định nhất. Vercel/Netlify sẽ tự động lắng nghe nhánh này để deploy.
- `develop`: Nhánh phát triển. Mọi tính năng, sửa lỗi (bug fixes), hoặc thay đổi giao diện đều được commit và đẩy lên nhánh này trong quá trình làm việc.

## 2. Quy trình Phát triển (Development Workflow)
1. Đảm bảo bạn đang ở nhánh `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. Thực hiện code và commit các thay đổi nhỏ liên tục lên nhánh `develop` (nhằm sao lưu và kiểm thử).
   ```bash
   git add .
   git commit -m "feat/fix: mô tả ngắn gọn"
   git push origin develop
   ```

## 3. Quy trình Đóng gói & Đưa lên Production (Release Workflow)
Khi một cụm tính năng đã hoàn thiện và được kiểm duyệt, thực hiện các bước sau để đưa lên `main`.

### Bước 3.1: Dọn dẹp lịch sử (Squash / Rebase)
Tuyệt đối **KHÔNG** merge trực tiếp hàng chục commit rác (thử nghiệm, sửa lỗi vặt) từ `develop` vào `main`. Phải gom chúng lại (Squash) thành 1 commit duy nhất có ý nghĩa.
Giả sử commit ổn định gần nhất trên `main` là `<commit-hash>`:
```bash
git checkout develop
# Quay ngược các thay đổi về dạng uncommitted (giữ nguyên code)
git reset --soft <commit-hash>
git add .
git commit -m "feat: [Tên cụm tính năng lớn / Phiên bản]"
git push -f origin develop
```

### Bước 3.2: Merge sang nhánh chính
```bash
git checkout main
git pull origin main
git merge develop
```

### Bước 3.3: Đánh dấu phiên bản (Tag Version)
Tạo tag đánh dấu phiên bản mới (Semantic Versioning: v1.0.1, v1.1.0...)
```bash
git tag -a v1.0.x -m "Release v1.0.x: Mô tả tính năng"
git push origin main --tags
```

### Bước 3.4: Tự động Deploy
Sau khi lệnh push hoàn tất, Vercel/Netlify sẽ tự động kích hoạt CI/CD pipeline để build và deploy mã nguồn từ nhánh `main`. Không cần thao tác thủ công thêm.

## 4. Tóm tắt (Cheatsheet) cho AI / Lập trình viên
Mỗi khi User hô "Merge sang main", "Cho code vào main", hoặc "Deploy", AI cần thực hiện tự động chuỗi lệnh sau:
```bash
# 1. Squash trên develop
git checkout develop
git reset --soft <hash-của-lần-merge-trước>
git add .
git commit -m "feat/fix: <tên_tính_năng>"
git push -f origin develop

# 2. Merge vào main
git checkout main
git merge develop

# 3. Đánh Tag & Push
git tag -a v<new_version> -m "Release v<new_version>"
git push origin main --tags
```
