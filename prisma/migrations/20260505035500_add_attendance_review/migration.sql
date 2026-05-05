-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "workReport" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewStatus" TEXT,
    "reviewerId" TEXT,
    "reviewComment" TEXT,
    "reviewedAt" DATETIME,
    "autoApproveAt" DATETIME,
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "delegatedFromId" TEXT,
    CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Attendance" ("createdAt", "date", "id", "session", "status", "updatedAt", "userId", "workReport") SELECT "createdAt", "date", "id", "session", "status", "updatedAt", "userId", "workReport" FROM "Attendance";
DROP TABLE "Attendance";
ALTER TABLE "new_Attendance" RENAME TO "Attendance";
CREATE INDEX "Attendance_userId_idx" ON "Attendance"("userId");
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");
CREATE INDEX "Attendance_reviewStatus_autoApproveAt_idx" ON "Attendance"("reviewStatus", "autoApproveAt");
CREATE INDEX "Attendance_reviewerId_idx" ON "Attendance"("reviewerId");
CREATE UNIQUE INDEX "Attendance_userId_date_session_key" ON "Attendance"("userId", "date", "session");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
