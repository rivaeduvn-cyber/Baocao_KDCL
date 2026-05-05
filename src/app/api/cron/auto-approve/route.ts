import { NextRequest, NextResponse } from "next/server";
import { findAttendancesNeedingAutoApprove, reviewAttendance, createNotification, findUserById } from "@/lib/db";

/**
 * GET /api/cron/auto-approve
 *
 * Auto-approve PENDING attendances whose autoApproveAt has passed.
 * Triggered by Vercel Cron (configured in vercel.json) at 00:01 daily.
 *
 * Authentication: Vercel Cron sends a Bearer token in Authorization header
 * matching CRON_SECRET env var. If unset, anyone can hit it — fine for dev,
 * but production MUST set CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const pending = await findAttendancesNeedingAutoApprove();
  let approved = 0;
  let notified = 0;

  for (const att of pending) {
    // Apply auto-approve (no human reviewer)
    await reviewAttendance(att.id, {
      reviewStatus: "APPROVED",
      reviewerId: att.userId, // self — no manager involved (can't have null due to schema)
      reviewComment: "Tự động duyệt sau 3 ngày không có phản hồi",
      autoApproved: true,
    });
    approved++;

    // Notify owner
    await createNotification({
      userId: att.userId,
      type: "REVIEW_AUTO_APPROVED",
      title: "Báo cáo của bạn được tự động duyệt",
      body: "Báo cáo đã quá 3 ngày không có phản hồi từ cấp trên, được tự động duyệt Đạt.",
      link: "/reports",
    });
    notified++;

    // Also notify direct manager (if any) so they know
    const owner = await findUserById(att.userId);
    if (owner?.managerId) {
      await createNotification({
        userId: owner.managerId,
        type: "REVIEW_AUTO_APPROVED",
        title: `Báo cáo của ${owner.name} đã auto-duyệt`,
        body: "Bạn chưa duyệt trong 3 ngày, hệ thống tự động duyệt Đạt.",
        link: "/my-team",
      });
      notified++;
    }
  }

  return NextResponse.json({ approved, notified });
}
