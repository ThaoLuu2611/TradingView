# Quy trình Git & Deploy — ChartViewPro

---

## Nhánh làm việc

- **`develop`**: Nhánh phát triển hàng ngày. Mọi code đều commit lên đây.
- **`main`**: Nhánh Production. Chỉ cập nhật khi deploy chính thức.

---

## Làm việc bình thường

Luôn đảm bảo đang ở nhánh `develop`:

```bash
git checkout develop
git add .
git commit -m "feat/fix: mô tả ngắn"
git push origin develop
```

---

## Deploy lên Production (khi user yêu cầu)

Thực hiện theo đúng 4 bước sau:

**Bước 1 — Gom commit (Squash)**
```bash
git checkout develop
git reset --soft <hash-commit-cũ-trên-main>
git add .
git commit -m "feat: [Tên tính năng / Phiên bản]"
git push -f origin develop
```

**Bước 2 — Merge vào main**
```bash
git checkout main
git merge develop
```

**Bước 3 — Tạo tag phiên bản**
```bash
git tag -a v1.x.x -m "Release v1.x.x"
git push origin main --tags
```

**Bước 4 — Quay về develop**
```bash
git checkout develop
```

---

## Lưu ý quan trọng
- **Không merge thẳng** hàng chục commit rác từ develop vào main — phải squash trước
- **Luôn quay về develop** sau khi deploy xong
- Vercel/Netlify tự động deploy khi main được push
