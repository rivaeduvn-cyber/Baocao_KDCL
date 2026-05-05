import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { countTasksFor } from "@/lib/db";

/**
 * GET /api/tasks/counts
 * Returns: { pending, overdue, awaitingReview }
 *   - pending: số task tôi cần làm (ASSIGNED/IN_PROGRESS/REOPENED)
 *   - overdue: pending + dueDate đã qua
 *   - awaitingReview: số task tôi đã giao đang ở trạng thái SUBMITTED chờ tôi xác nhận
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ pending: 0, overdue: 0, awaitingReview: 0 });

  const [pending, overdue, awaitingReview] = await Promise.all([
    countTasksFor(session.user.id, { pending: true }),
    countTasksFor(session.user.id, { overdue: true }),
    countTasksFor(session.user.id, { awaitingReview: true }),
  ]);

  return NextResponse.json({ pending, overdue, awaitingReview });
}
