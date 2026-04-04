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
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }
  const result = await tursoExecute(
    "SELECT id, email, name, role, createdAt FROM User ORDER BY createdAt DESC"
  );
  return result.rows as Partial<User>[];
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
}): Promise<Partial<User>> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.user.create({
      data: { name: data.name, email: data.email, password: data.password, role: data.role || "EMPLOYEE" },
      select: { id: true, email: true, name: true, role: true },
    });
  }
  const id = generateId();
  const now = nowISO();
  await tursoExecute(
    "INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, data.email, data.password, data.name, data.role || "EMPLOYEE", now, now]
  );
  return { id, email: data.email, name: data.name, role: data.role || "EMPLOYEE" };
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
  where: { userId?: string; month?: string },
  options?: { includeUser?: boolean; orderBy?: "asc" | "desc" }
): Promise<(Attendance | AttendanceWithUser)[]> {
  const includeUser = options?.includeUser ?? false;
  const order = options?.orderBy ?? "desc";

  if (!IS_TURSO) {
    const prisma = await getPrisma();
    const prismaWhere: Record<string, unknown> = {};
    if (where.userId) prismaWhere.userId = where.userId;
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
  if (where.userId) {
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
      user: { name: r.userName as string, email: r.userEmail as string },
    }));
  }

  const result = await tursoExecute(
    `SELECT * FROM Attendance a ${whereClause} ORDER BY a.date ${order === "asc" ? "ASC" : "DESC"}, a.session ASC`,
    args
  );
  return result.rows as Attendance[];
}

export async function createAttendance(data: {
  userId: string;
  date: string;
  session: string;
  status?: string;
  workReport?: string | null;
}): Promise<Attendance> {
  if (!IS_TURSO) {
    const prisma = await getPrisma();
    return prisma.attendance.create({
      data: {
        userId: data.userId,
        date: data.date,
        session: data.session,
        status: data.status || "PRESENT",
        workReport: data.workReport ?? null,
      },
    }) as Promise<Attendance>;
  }

  const id = generateId();
  const now = nowISO();
  try {
    await tursoExecute(
      "INSERT INTO Attendance (id, userId, date, session, status, workReport, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, data.userId, data.date, data.session, data.status || "PRESENT", data.workReport ?? null, now, now]
    );
  } catch (e: unknown) {
    // Unique constraint violation (userId, date, session)
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
