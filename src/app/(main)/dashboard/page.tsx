"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";
import StatsCards from "@/components/stats-cards";
import MonthlyChart from "@/components/monthly-chart";
import TodayReminder from "@/components/today-reminder";

interface Stats {
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  monthlyData: { month: string; present: number; absent: number; late: number }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>;
  }

  const isEmployee = session?.user?.role !== "ADMIN";
  const hasNoData = !stats || stats.totalSessions === 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        Tổng quan {!isEmployee ? "(Admin)" : ""}
      </h2>

      {isEmployee && <TodayReminder />}

      {hasNoData ? (
        <EmptyState isEmployee={isEmployee} />
      ) : (
        stats && (
          <>
            <StatsCards stats={stats} />
            <MonthlyChart data={stats.monthlyData} />
          </>
        )
      )}
    </div>
  );
}

function EmptyState({ isEmployee }: { isEmployee: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
        <ClipboardList className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
        {isEmployee ? "Chưa có dữ liệu chấm công" : "Hệ thống chưa có bản ghi nào"}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
        {isEmployee
          ? "Hãy bắt đầu chấm công buổi đầu tiên để xem thống kê và biểu đồ."
          : "Khi nhân viên bắt đầu chấm công, dữ liệu thống kê sẽ hiển thị ở đây."}
      </p>
      {isEmployee && (
        <Link
          href="/attendance"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all shadow-md shadow-blue-600/30"
        >
          Chấm công ngay
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
