import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { countPendingReviewsFor } from "@/lib/db";
import { resolveAttendanceScope } from "@/lib/org-tree";

/**
 * GET /api/attendance/pending-review-count
 * Returns count of pending-review attendances within the user's scope.
 * - Admin/VT: count all PENDING company-wide
 * - GD/TBP: count PENDING from their subordinates (recursive)
 * - STAFF/no level: 0
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ count: 0 });

  const scope = await resolveAttendanceScope(session.user);
  if (scope === null) {
    // Admin/VT — count all
    const { findAttendances } = await import("@/lib/db");
    const all = await findAttendances({});
    const count = all.filter((a) => a.reviewStatus === "PENDING").length;
    return NextResponse.json({ count });
  }

  const subs = scope.filter((id) => id !== session.user.id);
  if (subs.length === 0) return NextResponse.json({ count: 0 });

  const count = await countPendingReviewsFor(subs);
  return NextResponse.json({ count });
}
