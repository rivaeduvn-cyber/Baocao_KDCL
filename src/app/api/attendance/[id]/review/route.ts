import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendanceById, reviewAttendance, createNotification } from "@/lib/db";
import { isManagerOf } from "@/lib/org-tree";

/**
 * PUT /api/attendance/[id]/review
 * Body: { decision: "APPROVED" | "NEEDS_REVISION" | "REJECTED", comment?: string }
 *
 * Permission: reviewer phải là cấp trên (đệ quy) của attendance.userId,
 * hoặc role=ADMIN, hoặc level=VIEN_TRUONG.
 *
 * Override: nếu báo cáo đã được duyệt (APPROVED/REJECTED), chỉ cấp cao hơn
 * cấp trên trực tiếp (hoặc Admin/VT) được override; bắt buộc nhập comment.
 *
 * Auto-approved: cấp trên không thể duyệt lại; chỉ override (cấp cao hơn).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const att = await findAttendanceById(id);
  if (!att) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!att.reviewStatus) {
    return NextResponse.json({ error: "Báo cáo này không cần duyệt (chưa có nội dung)" }, { status: 400 });
  }

  const { decision, comment } = await req.json();
  if (!["APPROVED", "NEEDS_REVISION", "REJECTED"].includes(decision)) {
    return NextResponse.json({ error: "Quyết định không hợp lệ" }, { status: 400 });
  }

  // Permission: ADMIN role hoặc VIEN_TRUONG luôn pass
  // Còn lại: phải là cấp trên (đệ quy) của attendance.userId
  const isAdmin = session.user.role === "ADMIN";
  const isVT = session.user.level === "VIEN_TRUONG";
  let canReview = isAdmin || isVT;
  if (!canReview) {
    canReview = await isManagerOf(session.user.id, att.userId);
  }
  if (!canReview) {
    return NextResponse.json({ error: "Không có quyền duyệt báo cáo của nhân viên này" }, { status: 403 });
  }

  // Override logic
  const isOverride = att.reviewStatus !== "PENDING";
  if (isOverride) {
    // Auto-approved or đã duyệt → cần override
    // Chỉ cấp cao hơn cấp trên trực tiếp được override (hoặc Admin/VT)
    const isDirectManager = !isAdmin && !isVT && att.reviewerId === session.user.id;
    if (isDirectManager) {
      return NextResponse.json(
        { error: "Bạn đã duyệt báo cáo này rồi. Cấp cao hơn cần override." },
        { status: 403 }
      );
    }
    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: "Override bắt buộc phải có lý do" }, { status: 400 });
    }
  }

  const updated = await reviewAttendance(id, {
    reviewStatus: decision,
    reviewerId: session.user.id,
    reviewComment: comment?.trim() || null,
    autoApproved: false, // explicit decision, not auto
  });

  // Notify the report owner
  const decisionLabel: Record<string, string> = {
    APPROVED: "đã được duyệt Đạt",
    NEEDS_REVISION: "cần bổ sung",
    REJECTED: "không đạt",
  };
  await createNotification({
    userId: att.userId,
    type: `REVIEW_${decision}`,
    title: `Báo cáo ${decisionLabel[decision]}`,
    body: comment?.trim() || null,
    link: "/reports",
  });

  // If override, also notify the previous reviewer
  if (isOverride && att.reviewerId && att.reviewerId !== session.user.id) {
    await createNotification({
      userId: att.reviewerId,
      type: "REVIEW_OVERRIDDEN",
      title: "Quyết định duyệt của bạn đã bị override",
      body: comment?.trim() || null,
      link: "/my-team",
    });
  }

  return NextResponse.json(updated);
}
