import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendances, createAttendance } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const userId = searchParams.get("userId");
  const ownOnly = searchParams.get("ownOnly");

  const where: { userId?: string; month?: string } = {};

  if (session.user.role !== "ADMIN" || ownOnly === "true") {
    where.userId = session.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  if (month) {
    where.month = month;
  }

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
    return NextResponse.json(attendance, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Đã chấm công buổi này rồi" }, { status: 409 });
    }
    throw e;
  }
}
