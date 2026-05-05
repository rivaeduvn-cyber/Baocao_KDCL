/**
 * Database abstraction layer.
 * - Local dev (no TURSO_DATABASE_URL): delegates to Prisma with local SQLite
 * - Production (TURSO_DATABASE_URL set): uses Turso HTTP API via tursoExecute()
 */

import { tursoExecute } from "./turso";

const IS_TURSO = !!process.env.TURSO_DATABASE_URL;

// ---------- Types ----------

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  level: string | null;
  managerId: string | null;
  position: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  session: string;
  status: string;
  workReport: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  reviewStatus: string | null;
  reviewerId: string | null;
  reviewComment: string | null;
  reviewedAt: string | Date | null;
  autoApproveAt: string | Date | null;
  autoApproved: boolean;
  delegatedFromId: string | null;
}

export interface AttendanceWithUser extends Attendance {
  user: { name: string; email: string };
}

// ---------- Helpers ----------

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 25);
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Lazily import prisma only when needed (local dev) */
async function getPrisma() {
  const { prisma } = await import("./prisma");
  return prisma;
}

// ---------- User operations ----------

export async function findUserByEmail(email: string): Promise<User | null> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.user.findUnique({ where: { email } }) as Promise<User | null>;
  }
  const result = await tursoExecute("SELECT * FROM User WHERE email = ?", [email]);
  return (result.rows[0] as User) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.user.findUnique({ where: { id } }) as Promise<User | null>;
  }
  const result = await tursoExecute("SELECT * FROM User WHERE id = ?", [id]);
  return (result.rows[0] as User) ?? null;
}

export async function findAllUsers(): Promise<Partial<User>[]> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        level: true, managerId: true, position: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  const result = await tursoExecute(
    "SELECT id, email, name, role, level, managerId, position, createdAt FROM User ORDER BY createdAt DESC"
  );
  return result.rows as Partial<User>[];
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  level?: string | null;
  managerId?: string | null;
  position?: string | null;
}): Promise<Partial<User>> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || "EMPLOYEE",
        level: data.level ?? null,
        managerId: data.managerId ?? null,
        position: data.position ?? null,
      },
      select: { id: true, email: true, name: true, role: true, level: true, managerId: true, position: true },
    });
  }
  const id = generateId();
  const now = nowISO();
  await tursoExecute(
    "INSERT INTO User (id, email, password, name, role, level, managerId, position, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, data.email, data.password, data.name, data.role || "EMPLOYEE", data.level ?? null, data.managerId ?? null, data.position ?? null, now, now]
  );
  return {
    id, email: data.email, name: data.name,
    role: data.role || "EMPLOYEE",
    level: data.level ?? null,
    managerId: data.managerId ?? null,
    position: data.position ?? null,
  };
}

export async function updateUser(
  id: string,
  data: Record<string, unknown>
): Promise<Partial<User>> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true },
    });
  }
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      args.push(value);
    }
  }
  sets.push("updatedAt = datetime('now')");
  args.push(id);
  await tursoExecute(`UPDATE User SET ${sets.join(", ")} WHERE id = ?`, args);
  const result = await tursoExecute(
    "SELECT id, email, name, role FROM User WHERE id = ?",
    [id]
  );
  return result.rows[0] as Partial<User>;
}

export async function deleteUser(id: string): Promise<void> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    await prisma.user.delete({ where: { id } });
    return;
  }
  await tursoExecute("DELETE FROM User WHERE id = ?", [id]);
}

// ---------- Attendance operations ----------

export async function findAttendances(
  where: { userId?: string; userIds?: string[]; month?: string },
  options?: { includeUser?: boolean; orderBy?: "asc" | "desc" }
): Promise<(Attendance | AttendanceWithUser)[]> {
  const includeUser = options?.includeUser ?? false;
  const order = options?.orderBy ?? "desc";

  // userIds takes precedence over userId; empty array short-circuits to []
  if (where.userIds && where.userIds.length === 0) return [];

  if (!IS_TURSO) {
    const prisma = await getPrisma();
    const prismaWhere: Record<string, unknown> = {};
    if (where.userIds && where.userIds.length > 0) {
      prismaWhere.userId = { in: where.userIds };
    } else if (where.userId) {
      prismaWhere.userId = where.userId;
    }
    if (where.month) prismaWhere.date = { startsWith: where.month };
    return prisma.attendance.findMany({
      where: prismaWhere,
      include: includeUser ? { user: { select: { name: true, email: true } } } : undefined,
      orderBy: [{ date: order }, { session: "asc" }],
    }) as Promise<(Attendance | AttendanceWithUser)[]>;
  }

  // Build SQL
  const conditions: string[] = [];
  const args: unknown[] = [];
  if (where.userIds && where.userIds.length > 0) {
    const placeholders = where.userIds.map(() => "?").join(",");
    conditions.push(`a.userId IN (${placeholders})`);
    args.push(...where.userIds);
  } else if (where.userId) {
    conditions.push("a.userId = ?");
    args.push(where.userId);
  }
  if (where.month) {
    conditions.push("a.date LIKE ?");
    args.push(where.month + "%");
  }
  const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  if (includeUser) {
    const result = await tursoExecute(
      `SELECT a.*, u.name AS userName, u.email AS userEmail
       FROM Attendance a LEFT JOIN User u ON a.userId = u.id
       ${whereClause}
       ORDER BY a.date ${order === "asc" ? "ASC" : "DESC"}, a.session ASC`,
      args
    );
    return result.rows.map((r) => ({
      id: r.id as string,
      userId: r.userId as string,
      date: r.date as string,
      session: r.session as string,
      status: r.status as string,
      workReport: (r.workReport as string) ?? null,
      createdAt: r.createdAt as string,
      updatedAt: r.updatedAt as string,
      reviewStatus: (r.reviewStatus as string) ?? null,
      reviewerId: (r.reviewerId as string) ?? null,
      reviewComment: (r.reviewComment as string) ?? null,
      reviewedAt: (r.reviewedAt as string) ?? null,
      autoApproveAt: (r.autoApproveAt as string) ?? null,
      autoApproved: Number(r.autoApproved) === 1,
      delegatedFromId: (r.delegatedFromId as string) ?? null,
      user: { name: r.userName as string, email: r.userEmail as string },
    }));
  }

  const result = await tursoExecute(
    `SELECT * FROM Attendance a ${whereClause} ORDER BY a.date ${order === "asc" ? "ASC" : "DESC"}, a.session ASC`,
    args
  );
  return result.rows.map((r) => ({
    id: r.id as string,
    userId: r.userId as string,
    date: r.date as string,
    session: r.session as string,
    status: r.status as string,
    workReport: (r.workReport as string) ?? null,
    createdAt: r.createdAt as string,
    updatedAt: r.updatedAt as string,
    reviewStatus: (r.reviewStatus as string) ?? null,
    reviewerId: (r.reviewerId as string) ?? null,
    reviewComment: (r.reviewComment as string) ?? null,
    reviewedAt: (r.reviewedAt as string) ?? null,
    autoApproveAt: (r.autoApproveAt as string) ?? null,
    autoApproved: Number(r.autoApproved) === 1,
    delegatedFromId: (r.delegatedFromId as string) ?? null,
  }));
}

/** 3 ngày = 3 * 86400 * 1000 ms */
const AUTO_APPROVE_MS = 3 * 24 * 60 * 60 * 1000;

export async function createAttendance(data: {
  userId: string;
  date: string;
  session: string;
  status?: string;
  workReport?: string | null;
}): Promise<Attendance> {
  // Nếu có workReport → set PENDING + autoApproveAt = now + 3 ngày
  const hasReport = !!(data.workReport && data.workReport.trim().length > 0);
  const reviewStatus = hasReport ? "PENDING" : null;
  const autoApproveAt = hasReport ? new Date(Date.now() + AUTO_APPROVE_MS) : null;

  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attendance.create({
      data: {
        userId: data.userId,
        date: data.date,
        session: data.session,
        status: data.status || "PRESENT",
        workReport: data.workReport ?? null,
        reviewStatus,
        autoApproveAt,
      },
    }) as Promise<Attendance>;
  }

  const id = generateId();
  const now = nowISO();
  try {
    await tursoExecute(
      "INSERT INTO Attendance (id, userId, date, session, status, workReport, reviewStatus, autoApproveAt, autoApproved, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
      [
        id, data.userId, data.date, data.session,
        data.status || "PRESENT",
        data.workReport ?? null,
        reviewStatus,
        autoApproveAt ? autoApproveAt.toISOString() : null,
        now, now,
      ]
    );
  } catch (e: unknown) {
    if (e instanceof Error && (e.message.includes("UNIQUE") || e.message.includes("unique"))) {
      const err = new Error("UNIQUE_VIOLATION");
      (err as unknown as { code: string }).code = "P2002";
      throw err;
    }
    throw e;
  }
  return {
    id,
    userId: data.userId,
    date: data.date,
    session: data.session,
    status: data.status || "PRESENT",
    workReport: data.workReport ?? null,
    createdAt: now,
    updatedAt: now,
    reviewStatus,
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    autoApproveAt: autoApproveAt ? autoApproveAt.toISOString() : null,
    autoApproved: false,
    delegatedFromId: null,
  };
}

export async function findAttendanceById(id: string): Promise<Attendance | null> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attendance.findUnique({ where: { id } }) as Promise<Attendance | null>;
  }
  const result = await tursoExecute("SELECT * FROM Attendance WHERE id = ?", [id]);
  return (result.rows[0] as Attendance) ?? null;
}

export async function updateAttendance(
  id: string,
  data: Record<string, unknown>
): Promise<Attendance> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attendance.update({ where: { id }, data }) as Promise<Attendance>;
  }
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      args.push(value);
    }
  }
  sets.push("updatedAt = datetime('now')");
  args.push(id);
  await tursoExecute(`UPDATE Attendance SET ${sets.join(", ")} WHERE id = ?`, args);
  const result = await tursoExecute("SELECT * FROM Attendance WHERE id = ?", [id]);
  return result.rows[0] as Attendance;
}

export async function deleteAttendance(id: string): Promise<void> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    await prisma.attendance.delete({ where: { id } });
    return;
  }
  await tursoExecute("DELETE FROM Attendance WHERE id = ?", [id]);
}

/**
 * Apply review decision to attendance.
 * Side effect: updates reviewStatus + reviewerId + reviewComment + reviewedAt.
 * If decision is NEEDS_REVISION, the user can re-edit (handled in app logic).
 */
export async function reviewAttendance(
  id: string,
  data: {
    reviewStatus: "APPROVED" | "NEEDS_REVISION" | "REJECTED";
    reviewerId: string;
    reviewComment: string | null;
    autoApproved?: boolean;
    delegatedFromId?: string | null;
  }
): Promise<Attendance> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attendance.update({
      where: { id },
      data: {
        reviewStatus: data.reviewStatus,
        reviewerId: data.reviewerId,
        reviewComment: data.reviewComment,
        reviewedAt: new Date(),
        autoApproved: data.autoApproved ?? false,
        delegatedFromId: data.delegatedFromId ?? null,
      },
    }) as Promise<Attendance>;
  }
  const now = nowISO();
  await tursoExecute(
    `UPDATE Attendance
     SET reviewStatus = ?, reviewerId = ?, reviewComment = ?, reviewedAt = ?,
         autoApproved = ?, delegatedFromId = ?, updatedAt = ?
     WHERE id = ?`,
    [
      data.reviewStatus,
      data.reviewerId,
      data.reviewComment,
      now,
      data.autoApproved ? 1 : 0,
      data.delegatedFromId ?? null,
      now,
      id,
    ]
  );
  const result = await tursoExecute("SELECT * FROM Attendance WHERE id = ?", [id]);
  return result.rows[0] as Attendance;
}

/**
 * Find attendances ready to auto-approve (PENDING + autoApproveAt <= now).
 * Used by cron job.
 */
export async function findAttendancesNeedingAutoApprove(): Promise<Attendance[]> {
  const now = nowISO();
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attendance.findMany({
      where: {
        reviewStatus: "PENDING",
        autoApproveAt: { lte: new Date(now) },
      },
    }) as Promise<Attendance[]>;
  }
  const result = await tursoExecute(
    "SELECT * FROM Attendance WHERE reviewStatus = 'PENDING' AND autoApproveAt IS NOT NULL AND autoApproveAt <= ?",
    [now]
  );
  return result.rows as Attendance[];
}

/**
 * Reset review state to PENDING when user re-submits a NEEDS_REVISION report.
 * Refreshes autoApproveAt = now + 3d.
 */
export async function resetAttendanceReview(id: string): Promise<void> {
  const newDeadline = new Date(Date.now() + AUTO_APPROVE_MS).toISOString();
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    await prisma.attendance.update({
      where: { id },
      data: {
        reviewStatus: "PENDING",
        reviewedAt: null,
        autoApproveAt: new Date(newDeadline),
        autoApproved: false,
      },
    });
    return;
  }
  const now = nowISO();
  await tursoExecute(
    "UPDATE Attendance SET reviewStatus = 'PENDING', reviewedAt = NULL, autoApproveAt = ?, autoApproved = 0, updatedAt = ? WHERE id = ?",
    [newDeadline, now, id]
  );
}

/** Count pending reviews for a given reviewer (direct subordinates only). */
export async function countPendingReviewsFor(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attendance.count({
      where: { userId: { in: userIds }, reviewStatus: "PENDING" },
    });
  }
  const placeholders = userIds.map(() => "?").join(",");
  const result = await tursoExecute(
    `SELECT COUNT(*) as cnt FROM Attendance WHERE userId IN (${placeholders}) AND reviewStatus = 'PENDING'`,
    userIds
  );
  return Number(result.rows[0]?.cnt ?? 0);
}

// ---------- Attachment operations ----------

export interface Attachment {
  id: string;
  attendanceId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  createdAt: string | Date;
}

export async function findAttachmentsByAttendanceId(
  attendanceId: string
): Promise<Attachment[]> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attachment.findMany({
      where: { attendanceId },
      orderBy: { createdAt: "asc" },
    }) as unknown as Attachment[];
  }
  const result = await tursoExecute(
    "SELECT * FROM Attachment WHERE attendanceId = ? ORDER BY createdAt ASC",
    [attendanceId]
  );
  return result.rows as Attachment[];
}

export async function findAttachmentsByAttendanceIds(
  ids: string[]
): Promise<Attachment[]> {
  if (ids.length === 0) return [];
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attachment.findMany({
      where: { attendanceId: { in: ids } },
      orderBy: { createdAt: "asc" },
    }) as unknown as Attachment[];
  }
  const placeholders = ids.map(() => "?").join(",");
  const result = await tursoExecute(
    `SELECT * FROM Attachment WHERE attendanceId IN (${placeholders}) ORDER BY createdAt ASC`,
    ids
  );
  return result.rows as Attachment[];
}

export async function createAttachment(data: {
  attendanceId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}): Promise<Attachment> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attachment.create({ data }) as unknown as Attachment;
  }
  const id = generateId();
  const now = nowISO();
  await tursoExecute(
    "INSERT INTO Attachment (id, attendanceId, fileName, fileUrl, fileSize, fileType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, data.attendanceId, data.fileName, data.fileUrl, data.fileSize, data.fileType, now]
  );
  return { id, ...data, createdAt: now };
}

export async function findAttachmentById(id: string): Promise<Attachment | null> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attachment.findUnique({ where: { id } }) as unknown as Attachment | null;
  }
  const result = await tursoExecute("SELECT * FROM Attachment WHERE id = ?", [id]);
  return (result.rows[0] as Attachment) ?? null;
}

export async function countAttachmentsByAttendanceId(attendanceId: string): Promise<number> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attachment.count({ where: { attendanceId } });
  }
  const result = await tursoExecute(
    "SELECT COUNT(*) as cnt FROM Attachment WHERE attendanceId = ?",
    [attendanceId]
  );
  return Number(result.rows[0]?.cnt ?? 0);
}

export async function deleteAttachment(id: string): Promise<void> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    await prisma.attachment.delete({ where: { id } });
    return;
  }
  await tursoExecute("DELETE FROM Attachment WHERE id = ?", [id]);
}

// ---------- EditRequest operations ----------

export interface EditRequest {
  id: string;
  attendanceId: string;
  requesterId: string;
  reviewerId: string | null;
  proposedStatus: string | null;
  proposedReport: string | null;
  reason: string;
  status: string; // PENDING | APPROVED | REJECTED
  reviewNote: string | null;
  createdAt: string | Date;
  reviewedAt: string | Date | null;
}

export interface EditRequestEnriched extends EditRequest {
  requesterName: string;
  requesterEmail: string;
  attendanceDate: string;
  attendanceSession: string;
  currentStatus: string;
  currentReport: string | null;
}

export async function createEditRequest(data: {
  attendanceId: string;
  requesterId: string;
  proposedStatus?: string | null;
  proposedReport?: string | null;
  reason: string;
}): Promise<EditRequest> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.editRequest.create({
      data: {
        attendanceId: data.attendanceId,
        requesterId: data.requesterId,
        proposedStatus: data.proposedStatus ?? null,
        proposedReport: data.proposedReport ?? null,
        reason: data.reason,
      },
    }) as unknown as EditRequest;
  }
  const id = generateId();
  const now = nowISO();
  await tursoExecute(
    "INSERT INTO EditRequest (id, attendanceId, requesterId, proposedStatus, proposedReport, reason, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)",
    [id, data.attendanceId, data.requesterId, data.proposedStatus ?? null, data.proposedReport ?? null, data.reason, now]
  );
  return {
    id,
    attendanceId: data.attendanceId,
    requesterId: data.requesterId,
    reviewerId: null,
    proposedStatus: data.proposedStatus ?? null,
    proposedReport: data.proposedReport ?? null,
    reason: data.reason,
    status: "PENDING",
    reviewNote: null,
    createdAt: now,
    reviewedAt: null,
  };
}

export async function findEditRequestById(id: string): Promise<EditRequest | null> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.editRequest.findUnique({ where: { id } }) as unknown as EditRequest | null;
  }
  const result = await tursoExecute("SELECT * FROM EditRequest WHERE id = ?", [id]);
  return (result.rows[0] as EditRequest) ?? null;
}

/**
 * List edit requests, enriched with requester + attendance info.
 * @param filter `{ status?, requesterId? }` — both optional
 */
export async function findEditRequests(filter: {
  status?: string;
  requesterId?: string;
}): Promise<EditRequestEnriched[]> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    const rows = await prisma.editRequest.findMany({
      where: {
        ...(filter.status && { status: filter.status }),
        ...(filter.requesterId && { requesterId: filter.requesterId }),
      },
      include: {
        requester: { select: { name: true, email: true } },
        attendance: { select: { date: true, session: true, status: true, workReport: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      attendanceId: r.attendanceId,
      requesterId: r.requesterId,
      reviewerId: r.reviewerId,
      proposedStatus: r.proposedStatus,
      proposedReport: r.proposedReport,
      reason: r.reason,
      status: r.status,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      requesterName: r.requester.name,
      requesterEmail: r.requester.email,
      attendanceDate: r.attendance.date,
      attendanceSession: r.attendance.session,
      currentStatus: r.attendance.status,
      currentReport: r.attendance.workReport,
    })) as EditRequestEnriched[];
  }

  const conditions: string[] = [];
  const args: unknown[] = [];
  if (filter.status) {
    conditions.push("e.status = ?");
    args.push(filter.status);
  }
  if (filter.requesterId) {
    conditions.push("e.requesterId = ?");
    args.push(filter.requesterId);
  }
  const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const result = await tursoExecute(
    `SELECT e.*, u.name AS requesterName, u.email AS requesterEmail,
            a.date AS attendanceDate, a.session AS attendanceSession,
            a.status AS currentStatus, a.workReport AS currentReport
     FROM EditRequest e
     LEFT JOIN User u ON e.requesterId = u.id
     LEFT JOIN Attendance a ON e.attendanceId = a.id
     ${whereClause}
     ORDER BY e.createdAt DESC`,
    args
  );
  return result.rows as EditRequestEnriched[];
}

export async function updateEditRequest(
  id: string,
  data: { status: string; reviewerId: string; reviewNote?: string | null }
): Promise<EditRequest> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.editRequest.update({
      where: { id },
      data: {
        status: data.status,
        reviewerId: data.reviewerId,
        reviewNote: data.reviewNote ?? null,
        reviewedAt: new Date(),
      },
    }) as unknown as EditRequest;
  }
  const now = nowISO();
  await tursoExecute(
    "UPDATE EditRequest SET status = ?, reviewerId = ?, reviewNote = ?, reviewedAt = ? WHERE id = ?",
    [data.status, data.reviewerId, data.reviewNote ?? null, now, id]
  );
  const result = await tursoExecute("SELECT * FROM EditRequest WHERE id = ?", [id]);
  return result.rows[0] as EditRequest;
}

export async function countPendingEditRequests(): Promise<number> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.editRequest.count({ where: { status: "PENDING" } });
  }
  const result = await tursoExecute(
    "SELECT COUNT(*) as cnt FROM EditRequest WHERE status = 'PENDING'"
  );
  return Number(result.rows[0]?.cnt ?? 0);
}

// ---------- Notification operations ----------

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string | Date;
}

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<Notification> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        link: data.link ?? null,
      },
    }) as unknown as Notification;
  }
  const id = generateId();
  const now = nowISO();
  await tursoExecute(
    "INSERT INTO Notification (id, userId, type, title, body, link, read, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
    [id, data.userId, data.type, data.title, data.body ?? null, data.link ?? null, now]
  );
  return {
    id,
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body ?? null,
    link: data.link ?? null,
    read: false,
    createdAt: now,
  };
}

export async function findNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<Notification[]> {
  const limit = options?.limit ?? 30;
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.notification.findMany({
      where: { userId, ...(options?.unreadOnly && { read: false }) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }) as unknown as Notification[];
  }
  const where = options?.unreadOnly ? "WHERE userId = ? AND read = 0" : "WHERE userId = ?";
  const result = await tursoExecute(
    `SELECT * FROM Notification ${where} ORDER BY createdAt DESC LIMIT ${limit}`,
    [userId]
  );
  return result.rows.map((r) => ({
    id: r.id as string,
    userId: r.userId as string,
    type: r.type as string,
    title: r.title as string,
    body: (r.body as string) ?? null,
    link: (r.link as string) ?? null,
    read: Number(r.read) === 1,
    createdAt: r.createdAt as string,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.notification.count({ where: { userId, read: false } });
  }
  const result = await tursoExecute(
    "SELECT COUNT(*) as cnt FROM Notification WHERE userId = ? AND read = 0",
    [userId]
  );
  return Number(result.rows[0]?.cnt ?? 0);
}

// ---------- Task operations ----------

export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  assignerId: string;
  assigneeId: string;
  priority: string;
  dueDate: string | null;
  status: string;
  result: string | null;
  reviewNote: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  submittedAt: string | Date | null;
  completedAt: string | Date | null;
}

export interface TaskEnriched extends Task {
  assignerName: string;
  assigneeName: string;
}

export async function createTask(data: {
  parentId?: string | null;
  title: string;
  description?: string | null;
  assignerId: string;
  assigneeId: string;
  priority?: string;
  dueDate?: string | null;
}): Promise<Task> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.task.create({
      data: {
        parentId: data.parentId ?? null,
        title: data.title,
        description: data.description ?? null,
        assignerId: data.assignerId,
        assigneeId: data.assigneeId,
        priority: data.priority || "NORMAL",
        dueDate: data.dueDate ?? null,
      },
    }) as unknown as Task;
  }
  const id = generateId();
  const now = nowISO();
  await tursoExecute(
    `INSERT INTO Task (id, parentId, title, description, assignerId, assigneeId, priority, dueDate, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?)`,
    [
      id, data.parentId ?? null, data.title, data.description ?? null,
      data.assignerId, data.assigneeId, data.priority || "NORMAL",
      data.dueDate ?? null, now, now,
    ]
  );
  return {
    id,
    parentId: data.parentId ?? null,
    title: data.title,
    description: data.description ?? null,
    assignerId: data.assignerId,
    assigneeId: data.assigneeId,
    priority: data.priority || "NORMAL",
    dueDate: data.dueDate ?? null,
    status: "ASSIGNED",
    result: null,
    reviewNote: null,
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    completedAt: null,
  };
}

export async function findTaskById(id: string): Promise<Task | null> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.task.findUnique({ where: { id } }) as unknown as Task | null;
  }
  const result = await tursoExecute("SELECT * FROM Task WHERE id = ?", [id]);
  return (result.rows[0] as Task) ?? null;
}

/**
 * Find tasks. Filters all optional.
 *   - assigneeId: tasks I need to do
 *   - assignerId: tasks I gave out
 *   - status: filter by single status (or array via SQL IN)
 *   - parentId: 'null' string for top-level only, or specific id for children
 */
export async function findTasks(filter: {
  assigneeId?: string;
  assignerId?: string;
  assigneeIds?: string[];
  status?: string;
  parentId?: string | null;
  topLevelOnly?: boolean;
}): Promise<TaskEnriched[]> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    const where: Record<string, unknown> = {};
    if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    if (filter.assignerId) where.assignerId = filter.assignerId;
    if (filter.assigneeIds && filter.assigneeIds.length > 0) {
      where.assigneeId = { in: filter.assigneeIds };
    }
    if (filter.status) where.status = filter.status;
    if (filter.parentId !== undefined) where.parentId = filter.parentId;
    if (filter.topLevelOnly) where.parentId = null;

    const rows = await prisma.task.findMany({
      where,
      include: {
        assigner: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      parentId: r.parentId,
      title: r.title,
      description: r.description,
      assignerId: r.assignerId,
      assigneeId: r.assigneeId,
      priority: r.priority,
      dueDate: r.dueDate,
      status: r.status,
      result: r.result,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      submittedAt: r.submittedAt,
      completedAt: r.completedAt,
      assignerName: r.assigner.name,
      assigneeName: r.assignee.name,
    })) as TaskEnriched[];
  }

  const conditions: string[] = [];
  const args: unknown[] = [];
  if (filter.assigneeId) {
    conditions.push("t.assigneeId = ?");
    args.push(filter.assigneeId);
  }
  if (filter.assignerId) {
    conditions.push("t.assignerId = ?");
    args.push(filter.assignerId);
  }
  if (filter.assigneeIds && filter.assigneeIds.length > 0) {
    const ph = filter.assigneeIds.map(() => "?").join(",");
    conditions.push(`t.assigneeId IN (${ph})`);
    args.push(...filter.assigneeIds);
  }
  if (filter.status) {
    conditions.push("t.status = ?");
    args.push(filter.status);
  }
  if (filter.topLevelOnly) {
    conditions.push("t.parentId IS NULL");
  } else if (filter.parentId !== undefined) {
    if (filter.parentId === null) {
      conditions.push("t.parentId IS NULL");
    } else {
      conditions.push("t.parentId = ?");
      args.push(filter.parentId);
    }
  }
  const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const result = await tursoExecute(
    `SELECT t.*, ar.name AS assignerName, ae.name AS assigneeName
     FROM Task t
     LEFT JOIN User ar ON t.assignerId = ar.id
     LEFT JOIN User ae ON t.assigneeId = ae.id
     ${whereClause}
     ORDER BY t.status ASC, t.dueDate ASC, t.createdAt DESC`,
    args
  );
  return result.rows as TaskEnriched[];
}

export async function updateTaskStatus(
  id: string,
  data: { status: string; result?: string | null; reviewNote?: string | null }
): Promise<Task> {
  const setStatus = data.status;
  const isSubmit = setStatus === "SUBMITTED";
  const isComplete = setStatus === "COMPLETED";

  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.task.update({
      where: { id },
      data: {
        status: setStatus,
        ...(data.result !== undefined && { result: data.result }),
        ...(data.reviewNote !== undefined && { reviewNote: data.reviewNote }),
        ...(isSubmit && { submittedAt: new Date() }),
        ...(isComplete && { completedAt: new Date() }),
      },
    }) as unknown as Task;
  }

  const sets: string[] = ["status = ?", "updatedAt = ?"];
  const args: unknown[] = [setStatus, nowISO()];
  if (data.result !== undefined) {
    sets.push("result = ?");
    args.push(data.result);
  }
  if (data.reviewNote !== undefined) {
    sets.push("reviewNote = ?");
    args.push(data.reviewNote);
  }
  if (isSubmit) {
    sets.push("submittedAt = ?");
    args.push(nowISO());
  }
  if (isComplete) {
    sets.push("completedAt = ?");
    args.push(nowISO());
  }
  args.push(id);
  await tursoExecute(`UPDATE Task SET ${sets.join(", ")} WHERE id = ?`, args);
  const result = await tursoExecute("SELECT * FROM Task WHERE id = ?", [id]);
  return result.rows[0] as Task;
}

export async function deleteTask(id: string): Promise<void> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    await prisma.task.delete({ where: { id } });
    return;
  }
  await tursoExecute("DELETE FROM Task WHERE id = ?", [id]);
}

/** Auto-complete parent task if all children COMPLETED. Returns true if completed. */
export async function maybeAutoCompleteParent(parentId: string): Promise<boolean> {
  const children = await findTasks({ parentId });
  if (children.length === 0) return false;
  const allDone = children.every((c) => c.status === "COMPLETED");
  if (!allDone) return false;
  const parent = await findTaskById(parentId);
  if (!parent || parent.status === "COMPLETED") return false;
  await updateTaskStatus(parentId, {
    status: "COMPLETED",
    reviewNote: "Tự động hoàn thành khi tất cả subtask đã xong",
  });
  return true;
}

export async function countTasksFor(
  userId: string,
  filter?: { overdue?: boolean; awaitingReview?: boolean; pending?: boolean }
): Promise<number> {
  const today = getTodayString();
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    if (filter?.overdue) {
      return prisma.task.count({
        where: {
          assigneeId: userId,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "REOPENED"] },
          dueDate: { lt: today, not: null },
        },
      });
    }
    if (filter?.awaitingReview) {
      return prisma.task.count({
        where: { assignerId: userId, status: "SUBMITTED" },
      });
    }
    if (filter?.pending) {
      return prisma.task.count({
        where: {
          assigneeId: userId,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "REOPENED"] },
        },
      });
    }
    return 0;
  }

  if (filter?.overdue) {
    const r = await tursoExecute(
      `SELECT COUNT(*) as cnt FROM Task
       WHERE assigneeId = ? AND status IN ('ASSIGNED','IN_PROGRESS','REOPENED')
         AND dueDate IS NOT NULL AND dueDate < ?`,
      [userId, today]
    );
    return Number(r.rows[0]?.cnt ?? 0);
  }
  if (filter?.awaitingReview) {
    const r = await tursoExecute(
      `SELECT COUNT(*) as cnt FROM Task WHERE assignerId = ? AND status = 'SUBMITTED'`,
      [userId]
    );
    return Number(r.rows[0]?.cnt ?? 0);
  }
  if (filter?.pending) {
    const r = await tursoExecute(
      `SELECT COUNT(*) as cnt FROM Task
       WHERE assigneeId = ? AND status IN ('ASSIGNED','IN_PROGRESS','REOPENED')`,
      [userId]
    );
    return Number(r.rows[0]?.cnt ?? 0);
  }
  return 0;
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    await prisma.notification.updateMany({
      where: { userId, ...(ids && ids.length > 0 ? { id: { in: ids } } : {}) },
      data: { read: true },
    });
    return;
  }
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    await tursoExecute(
      `UPDATE Notification SET read = 1 WHERE userId = ? AND id IN (${placeholders})`,
      [userId, ...ids]
    );
  } else {
    await tursoExecute("UPDATE Notification SET read = 1 WHERE userId = ?", [userId]);
  }
}
