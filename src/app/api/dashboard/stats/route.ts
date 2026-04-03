import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendances } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const where = isAdmin ? {} : { userId: session.user.id };

  const attendances = await findAttendances(where);

  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const absent = attendances.filter((a) => a.status === "ABSENT").length;
  const late = attendances.filter((a) => a.status === "LATE").length;
  const leave = attendances.filter((a) => a.status === "LEAVE").length;

  // Monthly aggregation for chart (last 6 months)
  const monthlyMap = new Map<string, { present: number; absent: number; late: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { present: 0, absent: 0, late: 0 });
  }

  for (const a of attendances) {
    const month = a.date.substring(0, 7);
    if (monthlyMap.has(month)) {
      const entry = monthlyMap.get(month)!;
      if (a.status === "PRESENT") entry.present++;
      else if (a.status === "ABSENT") entry.absent++;
      else if (a.status === "LATE") entry.late++;
    }
  }

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));

  return NextResponse.json({
    totalSessions: attendances.length,
    present,
    absent,
    late,
    leave,
    monthlyData,
  });
}
