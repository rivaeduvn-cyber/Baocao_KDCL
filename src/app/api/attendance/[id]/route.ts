import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendanceById, updateAttendance, deleteAttendance, resetAttendanceReview } from "@/lib/db";
import { isWithinEditWindow, EDIT_WINDOW_DAYS } from "@/lib/utils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await findAttendanceById(id);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  if (session.user.role !== "ADMIN" && existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  // Bypass edit-window khi NEEDS_REVISION (user phải sửa lại theo yêu cầu của cấp trên)
  const isNeedsRevision = existing.reviewStatus === "NEEDS_REVISION";
  if (
    session.user.role !== "ADMIN" &&
    !isNeedsRevision &&
    !isWithinEditWindow(existing.date)
  ) {
    return NextResponse.json(
      { error: `Chỉ được sửa trong vòng ${EDIT_WINDOW_DAYS} ngày` },
      { status: 403 }
    );
  }

  const body = await req.json();
  const updated = await updateAttendance(id, {
    ...(body.status && { status: body.status }),
    ...(body.workReport !== undefined && { workReport: body.workReport }),
  });

  // Khi user re-submit báo cáo NEEDS_REVISION → reset về PENDING + refresh autoApproveAt
  if (isNeedsRevision && existing.userId === session.user.id) {
    await resetAttendanceReview(id);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await findAttendanceById(id);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  if (session.user.role !== "ADMIN" && existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  if (session.user.role !== "ADMIN" && !isWithinEditWindow(existing.date)) {
    return NextResponse.json(
      { error: `Chỉ được xóa trong vòng ${EDIT_WINDOW_DAYS} ngày` },
      { status: 403 }
    );
  }

  await deleteAttendance(id);
  return NextResponse.json({ ok: true });
}
