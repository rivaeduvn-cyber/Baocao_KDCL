"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

interface TodayStatus {
  date: string;
  hasMorning: boolean;
  hasAfternoon: boolean;
}

/**
 * Reminder banner shown on dashboard when user hasn't logged today's sessions.
 * - Both missing → red banner
 * - Only afternoon missing & past noon → yellow banner
 * - Both done → no banner
 */
export default function TodayReminder() {
  const [status, setStatus] = useState<TodayStatus | null>(null);

  useEffect(() => {
    fetch("/api/attendance/today")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  if (!status) return null;
  if (status.hasMorning && status.hasAfternoon) return null;

  const isWeekend = [0, 6].includes(new Date(status.date + "T00:00:00").getDay());
  if (isWeekend) return null;

  const pastNoon = new Date().getHours() >= 12;
  const missingMorning = !status.hasMorning;
  const missingAfternoon = !status.hasAfternoon && pastNoon;

  // Don't nag for afternoon before noon
  if (!missingMorning && !missingAfternoon) return null;

  const tone = missingMorning
    ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
    : "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-900 text-yellow-700 dark:text-yellow-300";

  const message = missingMorning && missingAfternoon
    ? "Hôm nay bạn chưa chấm công cả buổi sáng và chiều"
    : missingMorning
      ? "Hôm nay bạn chưa chấm công buổi sáng"
      : "Hôm nay bạn chưa chấm công buổi chiều";

  return (
    <div className={`flex items-center justify-between gap-3 p-4 rounded-xl border ${tone}`}>
      <div className="flex items-center gap-3 min-w-0">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <Link
        href="/attendance"
        className="flex items-center gap-1 text-sm font-medium hover:underline shrink-0"
      >
        Chấm ngay
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
