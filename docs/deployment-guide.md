# Deployment Guide

## Stack

- **App**: Next.js 14 trên Vercel
- **DB**: Turso (libSQL HTTP API) cho production, SQLite local cho dev
- **Storage**: Vercel Blob cho file đính kèm
- **Auth**: NextAuth (JWT)

## Env vars cần thiết

| Tên | Local (dev) | Vercel (prod) | Ghi chú |
|-----|-------------|---------------|---------|
| `DATABASE_URL` | `file:./dev.db` | (không cần) | Prisma local |
| `TURSO_DATABASE_URL` | (không) | `libsql://...` | Bật code dùng Turso |
| `TURSO_AUTH_TOKEN` | (không) | `eyJ...` | |
| `BLOB_READ_WRITE_TOKEN` | optional | bắt buộc | Vercel Blob |
| `NEXTAUTH_SECRET` | bắt buộc | bắt buộc | random string |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://yourdomain` | |

## Workflow migration database

### Local dev
```bash
# 1. Sửa prisma/schema.prisma
# 2. Tạo + apply migration vào SQLite local
npx prisma migrate dev --name <ten_migration>
# 3. (Nếu cần) chạy data migration script
npx tsx prisma/migrate-data-<xyz>.ts
```

### Production Turso
**Khi đẩy code có schema mới lên Vercel, phải apply migration lên Turso TRƯỚC** khi user truy cập, nếu không sẽ lỗi `no such table/column`.

Có 3 cách:

**Cách 1 — Script tự động (khuyến nghị):**
```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run migrate:turso
```

Script `scripts/migrate-turso.ts` đọc `prisma/migrations/`, so sánh với bảng `_TursoMigration`, chỉ chạy migration mới. Idempotent, có thể chạy lại nhiều lần.

Flags:
- `--dry-run` — chỉ in ra, không thực thi
- `--baseline` — đánh dấu tất cả migration là đã chạy mà không apply (dùng 1 lần khi DB đã ở schema mới nhất)

**Cách 2 — File SQL pending:**
File `prisma/turso-pending.sql` đã gộp sẵn các migration đang pending. Copy paste vào Turso dashboard hoặc:
```bash
turso db shell <db-name> < prisma/turso-pending.sql
```

**Cách 3 — Turso CLI thủ công:**
```bash
turso db shell <db-name>
> .read prisma/migrations/20260504075344_add_edit_request/migration.sql
```

### Sau migration
- Chạy data migration nếu có (VD: `migrate-data-org-tree.ts` gán level mặc định)
- Vào `/admin/users` set level + manager cho từng user thực tế

## Checklist deploy

- [ ] `npm run build` pass local
- [ ] Apply migration lên Turso (`npm run migrate:turso`)
- [ ] (Nếu có) chạy data migration thủ công lên Turso
- [ ] `git push origin main` → Vercel auto-deploy
- [ ] Smoke test: login admin, vào /admin/org-chart, verify schema OK
- [ ] Cập nhật env vars Vercel nếu schema mới yêu cầu

## Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `no such table: Notification` | Migration chưa apply Turso | Chạy `npm run migrate:turso` |
| `no such column: level` | Migration `add_user_org_tree` chưa apply | Như trên |
| `_TursoMigration` chưa có | Lần đầu chạy script | Tự động tạo, không cần làm gì |
| Migration fail giữa chừng | SQL lỗi syntax hoặc dữ liệu xung đột | Sửa `prisma/turso-pending.sql` chạy thủ công |
| User vừa được set level mới nhưng app không nhận | JWT cache session cũ | User logout/login lại |

## Lưu ý cho migration phức tạp

Prisma đôi khi sinh migration kiểu `RedefineTables` (DROP + CREATE + COPY) cho thay đổi cột phức tạp. Pattern này dùng `PRAGMA defer_foreign_keys` không hoạt động qua Turso HTTP API.

Script `scripts/migrate-turso.ts` có function `tursoTranslate()` xử lý từng case riêng (hiện hard-coded cho `add_user_org_tree`). Khi gặp migration mới dạng RedefineTables, cần thêm case mới vào hàm này, hoặc viết file ALTER tương đương trong `prisma/turso-pending.sql`.
