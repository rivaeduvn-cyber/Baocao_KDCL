import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findEditRequestById, updateEditRequest, updateAttendance, createNotification } from "@/lib/db";

/**
 * Admin reviews an edit request: APPROVED applies proposed changes to the attendance,
 * REJECTED leaves the attendance untouched. Either way, request is closed.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findEditRequestById(id);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Yêu cầu đã được xử lý" }, { status: 409 });
  }

  const body = await req.json();
  const { decision, reviewNote } = body as { decision: "APPROVED" | "REJECTED"; reviewNote?: string };

  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json({ error: "Quyết định không hợp lệ" }, { status: 400 });
  }

  if (decision === "APPROVED") {
    const patch: Record<string, unknown> = {};
    if (existing.proposedStatus) patch.status = existing.proposedStatus;
    if (existing.proposedReport !== null) patch.workReport = existing.proposedReport;
    if (Object.keys(patch).length > 0) {
      await updateAttendance(existing.attendanceId, patch);
    }
  }

  const updated = await updateEditRequest(id, {
    status: decision,
    reviewerId: session.user.id,
    reviewNote: reviewNote ?? null,
  });

  // Notify requester
  await createNotification({
    userId: existing.requesterId,
    type: decision === "APPROVED" ? "EDIT_REQUEST_APPROVED" : "EDIT_REQUEST_REJECTED",
    title: decision === "APPROVED"
      ? "Yêu cầu sửa đã được duyệt"
      : "Yêu cầu sửa bị từ chối",
    body: reviewNote || null,
    link: "/my-edit-requests",
  });

  return NextResponse.json(updated);
}
