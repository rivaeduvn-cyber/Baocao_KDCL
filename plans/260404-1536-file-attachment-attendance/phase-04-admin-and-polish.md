---
phase: 4
status: pending
priority: medium
---

# Phase 4: Admin View + Export + Polish

## Overview
Admin xem file đính kèm trong chấm công tổng hợp, xuất Excel kèm link file, polish UX.

## Tasks

### Admin chấm công tổng hợp
- Hiển thị cột file đính kèm (số lượng + preview)
- Admin có thể xóa file của bất kỳ nhân viên nào
- Filter: hiển thị "có file / không có file" (optional)

### Export Excel
- Cập nhật `/api/export` - thêm cột "File đính kèm"
- Mỗi cell chứa danh sách URL file (hyperlinks)

### Polish
- Loading state khi upload
- Error handling: upload fail → giữ attendance, báo lỗi file
- Mobile: file input responsive
- Toast messages cho upload/delete file

### Security
- Validate file ownership trước khi delete
- Rate limit upload (optional, Vercel có built-in)
- Sanitize file names (remove special chars)

## Files to Modify
- `src/app/(main)/admin/attendance/page.tsx` - thêm hiển thị file
- `src/app/api/export/route.ts` - thêm cột file vào Excel
- `src/components/attendance-table.tsx` - admin view files

## Success Criteria
- [ ] Admin thấy file đính kèm của tất cả nhân viên
- [ ] Admin xóa được file của nhân viên
- [ ] Export Excel có cột file với hyperlinks
- [ ] Upload/delete có loading + toast
- [ ] Mobile responsive
