import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findEditRequests, createEditRequest, findAttendanceById } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const filter: { status?: string; requesterId?: string } = {};
  if (status) filter.status = status;

  // Non-admin only sees their own requests
  if (session.user.role !== "ADMIN") {
    filter.requesterId = session.user.id;
  }

  const rows = await findEditRequests(filter);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { attendanceId, proposedStatus, proposedReport, reason } = body;

  if (!attendanceId || !reason || reason.trim().length === 0) {
    return NextResponse.json({ error: "Thiếu lý do hoặc bản ghi" }, { status: 400 });
  }

  const attendance = await findAttendanceById(attendanceId);
  if (!attendance) {
    return NextResponse.json({ error: "Không tìm thấy bản ghi" }, { status: 404 });
  }

  // Only the owner can request edit (admin doesn't need to — they edit directly)
  if (attendance.userId !== session.user.id) {
    return NextResponse.json({ error: "Không có quyền yêu cầu sửa bản ghi này" }, { status: 403 });
  }

  const editRequest = await createEditRequest({
    attendanceId,
    requesterId: session.user.id,
    proposedStatus: proposedStatus ?? null,
    proposedReport: proposedReport ?? null,
    reason: reason.trim(),
  });

  return NextResponse.json(editRequest, { status: 201 });
}
