---
phase: 3
status: pending
priority: high
---

# Phase 3: Frontend Upload + Hiển thị File

## Overview
Thêm file input vào form chấm công, hiển thị file đã đính kèm trong bảng.

## Components to Modify

### attendance-form.tsx
- Thêm file input (multiple, max 5)
- Hiển thị preview file đã chọn (tên + size + nút xóa)
- Upload flow: Chấm công thành công → Upload files → Refresh
- Progress indicator khi upload

### attendance-table.tsx
- Hiển thị icon paperclip + số file đính kèm
- Click mở danh sách file (download links)

## Create
- `src/components/file-upload-input.tsx` - Reusable file input component
  - Drag & drop zone
  - File preview list (name, size, remove button)
  - Max 5 files indicator
  - Accepted: tất cả file types
  - Max 10MB per file validation client-side

- `src/components/attachment-list.tsx` - Hiển thị danh sách file đính kèm
  - File icon theo type (image/pdf/doc/other)
  - File name + size
  - Download link
  - Delete button (owner/admin only)

## Upload Flow

```
1. User điền form chấm công + chọn files
2. Submit → POST /api/attendance (tạo attendance record)
3. Nhận attendanceId
4. POST /api/upload (FormData: files + attendanceId)
5. Toast: "Chấm công + đính kèm X file thành công"
6. Refresh table
```

## UI Design

```
┌──────────────────────────────────────┐
│ [Form chấm công hiện tại]           │
│                                      │
│ 📎 Đính kèm file (tối đa 5 file)   │
│ ┌──────────────────────────────────┐ │
│ │  Kéo thả file hoặc click chọn   │ │
│ │         [Chọn file]              │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 📄 report.pdf (2.1 MB)        [✕]  │
│ 📄 screenshot.png (450 KB)    [✕]  │
│                                      │
│ [🚀 Chấm công]                      │
└──────────────────────────────────────┘
```

## Table hiển thị

```
| Ngày  | Buổi  | Trạng thái | Công việc  | 📎  |
|-------|-------|------------|------------|-----|
| 04/04 | Sáng  | Có mặt     | Viết báo...| 2   | ← click mở list
```

## Success Criteria
- [ ] File input hoạt động (chọn + drag/drop)
- [ ] Preview file trước khi submit
- [ ] Client-side validation (size, count)
- [ ] Upload thành công sau khi chấm công
- [ ] Table hiển thị số file đính kèm
- [ ] Click xem + download file
- [ ] Dark mode support
