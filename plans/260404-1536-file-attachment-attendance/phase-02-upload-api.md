---
phase: 2
status: pending
priority: high
---

# Phase 2: Upload API + File Management

## Overview
Tạo API endpoint upload file lên Vercel Blob và lưu metadata vào DB.

## API Design

### POST /api/upload
- **Auth:** Authenticated user
- **Input:** FormData với file(s) + attendanceId
- **Validation:**
  - Max 5 files per attendance
  - Max 10MB per file
  - attendanceId phải thuộc về user (hoặc user là admin)
- **Flow:** Upload file → Vercel Blob → Lưu Attachment record → Return metadata

```typescript
// Request: multipart/form-data
// - files: File[] (max 5)
// - attendanceId: string

// Response:
{
  attachments: [
    { id, fileName, fileUrl, fileSize, fileType, createdAt }
  ]
}
```

### DELETE /api/upload/[id]
- **Auth:** Owner hoặc Admin
- **Flow:** Xóa file khỏi Vercel Blob → Xóa Attachment record

### GET /api/upload?attendanceId=xxx
- **Auth:** Owner hoặc Admin
- **Response:** List attachments cho attendance đó

## Files to Create/Modify

### Create
- `src/app/api/upload/route.ts` - POST (upload) + GET (list)
- `src/app/api/upload/[id]/route.ts` - DELETE

### Modify
- `src/app/api/attendance/route.ts` - GET: include attachments count in response

## Implementation Steps

1. Tạo `src/app/api/upload/route.ts`
   - Parse FormData
   - Validate file count/size
   - Verify attendance ownership
   - Upload to Vercel Blob via `put()`
   - Save Attachment records via `createAttachment()`
2. Tạo `src/app/api/upload/[id]/route.ts`
   - Verify ownership
   - Delete from Vercel Blob via `del()`
   - Delete Attachment record
3. Sửa GET `/api/attendance` - thêm attachment count/list

## Key Code

```typescript
import { put, del } from "@vercel/blob";

// Upload
const blob = await put(fileName, file, { access: "public" });
// blob.url → lưu vào Attachment.fileUrl

// Delete
await del(fileUrl);
```

## Success Criteria
- [ ] Upload 1-5 files thành công
- [ ] File > 10MB bị reject
- [ ] > 5 files per attendance bị reject
- [ ] Delete file xóa cả Blob + DB record
- [ ] Employee chỉ thao tác file của mình
