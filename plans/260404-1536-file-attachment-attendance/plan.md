---
status: planned
blockedBy: []
blocks: []
---

# Plan: Đính kèm file kết quả công việc khi chấm công

## Overview
- **Priority:** Medium
- **Status:** Planned
- **Effort:** ~4 phases

Cho phép nhân viên upload tối đa 5 file khi chấm công. File lưu trên Vercel Blob (free 500MB). Không giới hạn loại file, giới hạn dung lượng mỗi file 10MB.

## Key Decisions
- **Storage:** Vercel Blob - tích hợp sẵn, free tier 500MB, API đơn giản
- **Max files:** 5 per attendance record
- **Max size:** 10MB per file
- **File types:** Tất cả (không giới hạn)
- **DB schema:** Thêm bảng `Attachment` liên kết với `Attendance`

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [DB schema + Vercel Blob setup](phase-01-db-and-blob-setup.md) | pending |
| 2 | [Upload API + file management](phase-02-upload-api.md) | pending |
| 3 | [Frontend: form upload + hiển thị file](phase-03-frontend-upload.md) | pending |
| 4 | [Admin view + export + polish](phase-04-admin-and-polish.md) | pending |

## Architecture

```
User upload → POST /api/upload → Vercel Blob → URL saved to Attachment table
                                                    ↓
                                              Linked to Attendance via attendanceId
```

## Related Files
- `prisma/schema.prisma` - thêm model Attachment
- `src/lib/db.ts` - thêm CRUD Attachment
- `src/lib/turso.ts` - không đổi (dùng tursoExecute có sẵn)
- `src/components/attendance-form.tsx` - thêm file input
- `src/components/attendance-table.tsx` - hiển thị file đính kèm
- `src/app/api/upload/route.ts` - API upload mới
- `src/app/api/attendance/route.ts` - sửa POST trả về attachments
