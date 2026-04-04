---
phase: 1
status: pending
priority: high
---

# Phase 1: DB Schema + Vercel Blob Setup

## Overview
Thêm bảng Attachment vào database và cài đặt Vercel Blob storage.

## Requirements
- Bảng Attachment liên kết với Attendance (1 attendance → nhiều attachments)
- Cài `@vercel/blob` package
- Tạo Blob store trên Vercel dashboard

## DB Schema

### Prisma (local dev)
```prisma
model Attachment {
  id           String     @id @default(cuid())
  attendanceId String
  fileName     String
  fileUrl      String
  fileSize     Int
  fileType     String
  createdAt    DateTime   @default(now())
  attendance   Attendance @relation(fields: [attendanceId], references: [id], onDelete: Cascade)

  @@index([attendanceId])
}
```

Cập nhật Attendance model:
```prisma
model Attendance {
  ...
  attachments Attachment[]
}
```

### Turso SQL (production)
```sql
CREATE TABLE IF NOT EXISTS "Attachment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attendanceId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileType" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Attachment_attendanceId_idx" ON "Attachment"("attendanceId");
```

## Implementation Steps

1. Cài `@vercel/blob`
2. Cập nhật `prisma/schema.prisma` - thêm Attachment model
3. Chạy `npx prisma migrate dev --name add-attachment`
4. Chạy SQL tạo bảng trên Turso
5. Tạo Vercel Blob store: `vercel blob store create`
6. Thêm env var `BLOB_READ_WRITE_TOKEN` trên Vercel
7. Cập nhật `src/lib/db.ts` - thêm CRUD functions cho Attachment

### db.ts functions mới
```typescript
// Attachment operations
findAttachmentsByAttendanceId(attendanceId: string) → Attachment[]
createAttachment(data: {attendanceId, fileName, fileUrl, fileSize, fileType}) → Attachment
deleteAttachment(id: string) → void
```

## Success Criteria
- [ ] Prisma migrate thành công
- [ ] Turso table tạo OK
- [ ] Vercel Blob token hoạt động
- [ ] db.ts CRUD functions cho Attachment hoàn chỉnh
