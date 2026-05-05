"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, ArrowRight } from "lucide-react";

interface Counts {
  pending: number;
  overdue: number;
  awaitingReview: number;
}

/**
 * Dashboard banner showing user's task summary:
 *  - "M việc đang chờ bạn xác nhận" (assigner perspective)
 *  - "N việc quá hạn của bạn" (assignee perspective)
 * Hidden if all zero.
 */
export default function TaskSummaryBanner() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    fetch("/api/tasks/counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCounts(data))
      .catch(() => {});
  }, []);

  if (!counts) return null;
  if (counts.overdue === 0 && counts.awaitingReview === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {counts.overdue > 0 && (
        <Link
          href="/my-tasks"
          className="flex items-center justify-between gap-3 p-4 rounded-xl border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {counts.overdue} việc quá hạn
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Cần xử lý gấp
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-red-500 shrink-0" />
        </Link>
      )}

      {counts.awaitingReview > 0 && (
        <Link
          href="/team-tasks"
          className="flex items-center justify-between gap-3 p-4 rounded-xl border bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <ClipboardList className="w-5 h-5 text-purple-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {counts.awaitingReview} việc chờ bạn xác nhận
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Cấp dưới đã nộp việc
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-500 shrink-0" />
        </Link>
      )}
    </div>
  );
}
