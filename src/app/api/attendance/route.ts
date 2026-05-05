import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendances, createAttendance, findUserById, createNotification } from "@/lib/db";
import { resolveAttendanceScope } from "@/lib/org-tree";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const userId = searchParams.get("userId");
  const ownOnly = searchParams.get("ownOnly");

  const where: { userId?: string; userIds?: string[]; month?: string } = {};

  if (ownOnly === "true") {
    // Always restrict to self
    where.userId = session.user.id;
  } else {
    // Resolve scope by role + level
    const scope = await resolveAttendanceScope(session.user);
    if (scope === null) {
      // Admin or VT: see everyone, optionally filter by userId
      if (userId) where.userId = userId;
    } else {
      // GD/TBP/STAFF: scoped to self + subordinates
      if (userId) {
        // explicit userId only allowed if within scope
        if (!scope.includes(userId)) {
          return NextResponse.json({ error: "Không có quyền xem nhân viên này" }, { status: 403 });
        }
        where.userId = userId;
      } else {
        where.userIds = scope;
      }
    }
  }

  if (month) where.month = month;

  const attendances = await findAttendances(where, { includeUser: true, orderBy: "desc" });
  return NextResponse.json(attendances);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, session: sess, status, workReport } = body;

  if (!date || !sess) {
    return NextResponse.json({ error: "Thiếu ngày hoặc buổi" }, { status: 400 });
  }

  if (!["MORNING", "AFTERNOON"].includes(sess)) {
    return NextResponse.json({ error: "Buổi không hợp lệ" }, { status: 400 });
  }

  try {
    const attendance = await createAttendance({
      userId: session.user.id,
      date,
      session: sess,
      status: status || "PRESENT",
      workReport: workReport || null,
    });

    // Notify direct manager nếu có workReport (= reviewStatus PENDING)
    if (attendance.reviewStatus === "PENDING" && session.user.managerId) {
      const manager = await findUserById(session.user.managerId);
      if (manager) {
        await createNotification({
          userId: manager.id,
          type: "REVIEW_REQUESTED",
          title: `${session.user.name} có báo cáo mới cần duyệt`,
          body: workReport.length > 100 ? workReport.slice(0, 100) + "..." : workReport,
          link: "/my-team",
        });
      }
    }

    return NextResponse.json(attendance, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Đã chấm công buổi này rồi" }, { status: 409 });
    }
    throw e;
  }
}
