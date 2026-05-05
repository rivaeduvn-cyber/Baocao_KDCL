import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendances, findAllUsers, AttendanceWithUser } from "@/lib/db";
import { resolveAttendanceScope } from "@/lib/org-tree";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Allow Admin role, VT, GD, TBP — STAFF không có report tổng hợp
  const scope = await resolveAttendanceScope(session.user);
  // STAFF level (scope chỉ chứa chính họ, không có cấp dưới) → từ chối
  if (scope !== null && scope.length <= 1) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const month = req.nextUrl.searchParams.get("month") || undefined;
  const where: { month?: string; userIds?: string[] } = {};
  if (month) where.month = month;
  if (scope !== null) where.userIds = scope;

  const [attendances, allUsers] = await Promise.all([
    findAttendances(where, { includeUser: true, orderBy: "asc" }) as Promise<AttendanceWithUser[]>,
    findAllUsers(),
  ]);

  // Per-user breakdown
  const byUser = new Map<
    string,
    { name: string; email: string; total: number; present: number; absent: number; late: number; leave: number; reports: number }
  >();
  for (const a of attendances) {
    const key = a.userId;
    if (!byUser.has(key)) {
      byUser.set(key, {
        name: a.user.name,
        email: a.user.email,
        total: 0, present: 0, absent: 0, late: 0, leave: 0, reports: 0,
      });
    }
    const row = byUser.get(key)!;
    row.total++;
    if (a.status === "PRESENT") row.present++;
    else if (a.status === "ABSENT") row.absent++;
    else if (a.status === "LATE") row.late++;
    else if (a.status === "LEAVE") row.leave++;
    if (a.workReport && a.workReport.trim().length > 0) row.reports++;
  }

  const perUser = Array.from(byUser.entries()).map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.total - a.total);

  // Totals
  const totals = perUser.reduce(
    (acc, u) => ({
      total: acc.total + u.total,
      present: acc.present + u.present,
      absent: acc.absent + u.absent,
      late: acc.late + u.late,
      leave: acc.leave + u.leave,
      reports: acc.reports + u.reports,
    }),
    { total: 0, present: 0, absent: 0, late: 0, leave: 0, reports: 0 }
  );

  // Top late / absent
  const topLate = [...perUser].filter((u) => u.late > 0).sort((a, b) => b.late - a.late).slice(0, 5);
  const topAbsent = [...perUser].filter((u) => u.absent > 0).sort((a, b) => b.absent - a.absent).slice(0, 5);

  // Employees who haven't logged any attendance in this month (exclude admins)
  // Scope: nếu có scope (GD/TBP), chỉ tính người trong scope
  const inScope = scope === null
    ? (u: { id?: string; role?: string }) => u.role !== "ADMIN"
    : (u: { id?: string }) => !!u.id && scope.includes(u.id);

  const reportedIds = new Set(byUser.keys());
  const missingUsers = allUsers
    .filter((u) => inScope(u) && u.id && u.id !== session.user.id && !reportedIds.has(u.id))
    .map((u) => ({ userId: u.id!, name: u.name || "", email: u.email || "" }));

  const totalEmployees = allUsers.filter(inScope).filter((u) => u.id !== session.user.id).length;

  return NextResponse.json({
    totals,
    perUser,
    topLate,
    topAbsent,
    missingUsers,
    employeeCount: perUser.length,
    totalEmployees,
  });
}
