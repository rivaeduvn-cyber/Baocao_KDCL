"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import StatsCards from "@/components/stats-cards";
import MonthlyChart from "@/components/monthly-chart";

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
    return <div className="text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        Tổng quan {session?.user?.role === "ADMIN" ? "(Admin)" : ""}
      </h2>
      {stats && (
        <>
          <StatsCards stats={stats} />
          <MonthlyChart data={stats.monthlyData} />
        </>
      )}
    </div>
  );
}
