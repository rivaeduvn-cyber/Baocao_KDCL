import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendances } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

/**
 * Returns which sessions the current user has logged for today.
 * Shape: { date, hasMorning, hasAfternoon }
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = getTodayString();
  const records = await findAttendances({ userId: session.user.id, month: today.substring(0, 7) });
  const todayRecords = records.filter((r) => r.date === today);

  return NextResponse.json({
    date: today,
    hasMorning: todayRecords.some((r) => r.session === "MORNING"),
    hasAfternoon: todayRecords.some((r) => r.session === "AFTERNOON"),
  });
}
