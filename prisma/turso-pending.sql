-- =============================================================
-- Turso production migration script
-- Generated 2026-05-05 — applies 3 pending migrations + data backfill
--
-- Apply via Turso CLI:
--    turso db shell <db-name> < prisma/turso-pending.sql
-- Or paste into Turso dashboard SQL console.
--
-- IDEMPOTENT-ish: uses CREATE TABLE IF NOT EXISTS / ADD COLUMN may fail
-- if already exists — that's expected, just re-run after fixing the
-- failing statement or skip blocks already applied.
-- =============================================================

-- -------------------------------------------------------------
-- 1) EditRequest (migration 20260504075344)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "EditRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendanceId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "proposedStatus" TEXT,
    "proposedReport" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "EditRequest_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EditRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EditRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "EditRequest_status_idx"       ON "EditRequest"("status");
CREATE INDEX IF NOT EXISTS "EditRequest_requesterId_idx"  ON "EditRequest"("requesterId");
CREATE INDEX IF NOT EXISTS "EditRequest_attendanceId_idx" ON "EditRequest"("attendanceId");

-- -------------------------------------------------------------
-- 2) Notification (migration 20260504081738)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx"  ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx"    ON "Notification"("createdAt");

-- -------------------------------------------------------------
-- 3) User org tree (migration 20260505023115) — Turso-friendly
--    Original Prisma migration uses RedefineTables (CREATE new + DROP +
--    RENAME) with PRAGMA, which is unreliable over HTTP API.
--    For Turso production we use ALTER TABLE ADD COLUMN — same effect,
--    only difference: no FK constraint on managerId (SQLite enforces
--    FK only when PRAGMA foreign_keys=ON, and the app validates cycles
--    in code anyway).
-- -------------------------------------------------------------
ALTER TABLE "User" ADD COLUMN "level"     TEXT;
ALTER TABLE "User" ADD COLUMN "managerId" TEXT;
ALTER TABLE "User" ADD COLUMN "position"  TEXT;
CREATE INDEX IF NOT EXISTS "User_managerId_idx" ON "User"("managerId");
CREATE INDEX IF NOT EXISTS "User_level_idx"     ON "User"("level");

-- -------------------------------------------------------------
-- 4) Data backfill — gán level mặc định cho user hiện có
--    role=ADMIN giữ level=NULL (ngoài cây tổ chức)
--    role=EMPLOYEE → STAFF (nhân sự bộ phận, sau admin sẽ sửa cho VT/GD/TBP)
-- -------------------------------------------------------------
UPDATE "User" SET "level" = 'STAFF'
WHERE "role" = 'EMPLOYEE' AND "level" IS NULL;
