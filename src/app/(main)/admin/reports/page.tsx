"use client";

import { useEffect, useState } from "react";
import { getCurrentMonth } from "@/lib/utils";
import { Calendar, CheckCircle, XCircle, AlertTriangle, Coffee, Users, FileText, FileSpreadsheet, UserX } from "lucide-react";

interface UserRow {
  userId: string;
  name: string;
  email: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  reports: number;
}

interface MissingUser {
  userId: string;
  name: string;
  email: string;
}

interface Summary {
  totals: { total: number; present: number; absent: number; late: number; leave: number; reports: number };
  perUser: UserRow[];
  topLate: UserRow[];
  topAbsent: UserRow[];
  missingUsers: MissingUser[];
  employeeCount: number;
  totalEmployees: number;
}

export default function AdminReportsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/summary?month=${month}`)
      .then((r) => r.json())
      .then((data) => setSummary(data))
      .finally(() => setLoading(false));
  }, [month]);

  async function handleExport(format: "excel" | "pdf") {
    setExporting(format);
    try {
      const res = await fetch(`/api/export?format=${format}&month=${month}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bao-cao-tong-hop-${month}.${format === "excel" ? "xlsx" : "pdf"}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Báo cáo tổng hợp</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
          <button
            onClick={() => handleExport("excel")}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-all shadow-md shadow-green-600/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === "excel" ? "Đang xuất..." : "Excel"}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-all shadow-md shadow-red-600/30"
          >
            <FileText className="w-4 h-4" />
            {exporting === "pdf" ? "Đang xuất..." : "PDF"}
          </button>
        </div>
      </div>

      {loading || !summary ? (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500">
          Đang tải...
        </div>
      ) : (
        <>
          <SummaryCards
            totals={summary.totals}
            employeeCount={summary.employeeCount}
            totalEmployees={summary.totalEmployees}
          />

          {summary.totals.total === 0 && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500">
              Không có dữ liệu chấm công cho tháng này
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingCard
              title="Top đi trễ"
              icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
              rows={summary.topLate}
              metricKey="late"
              metricLabel="lần"
              empty="Không có ai đi trễ"
            />
            <RankingCard
              title="Top vắng"
              icon={<XCircle className="w-4 h-4 text-red-500" />}
              rows={summary.topAbsent}
              metricKey="absent"
              metricLabel="buổi"
              empty="Không có ai vắng"
            />
          </div>

          <MissingUsersCard users={summary.missingUsers} />

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Chi tiết theo nhân viên</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nhân viên</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tổng buổi</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Có mặt</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Đi trễ</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Vắng</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Nghỉ phép</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Có báo cáo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {summary.perUser.map((u) => (
                    <tr key={u.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{u.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200">{u.total}</td>
                      <td className="px-4 py-3 text-center text-green-600 dark:text-green-400">{u.present}</td>
                      <td className="px-4 py-3 text-center text-yellow-600 dark:text-yellow-400">{u.late}</td>
                      <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{u.absent}</td>
                      <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400">{u.leave}</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                        {u.reports}/{u.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCards({
  totals,
  employeeCount,
  totalEmployees,
}: {
  totals: Summary["totals"];
  employeeCount: number;
  totalEmployees: number;
}) {
  const cards = [
    { label: "Đã khai báo", value: `${employeeCount}/${totalEmployees}`, icon: Users, color: "from-indigo-500 to-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950" },
    { label: "Tổng buổi", value: totals.total, icon: Calendar, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Có mặt", value: totals.present, icon: CheckCircle, color: "from-green-500 to-green-600", bg: "bg-green-50 dark:bg-green-950" },
    { label: "Đi trễ", value: totals.late, icon: AlertTriangle, color: "from-yellow-500 to-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
    { label: "Vắng", value: totals.absent, icon: XCircle, color: "from-red-500 to-red-600", bg: "bg-red-50 dark:bg-red-950" },
    { label: "Nghỉ phép", value: totals.leave, icon: Coffee, color: "from-purple-500 to-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className={`${c.bg} rounded-xl p-4 border border-gray-200/50 dark:border-gray-800 transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{c.value}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function RankingCard({
  title,
  icon,
  rows,
  metricKey,
  metricLabel,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  rows: UserRow[];
  metricKey: "late" | "absent";
  metricLabel: string;
  empty: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-gray-400 dark:text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r, idx) => (
            <li key={r.userId} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold flex items-center justify-center text-gray-600 dark:text-gray-300">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.email}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 shrink-0">
                {r[metricKey]} {metricLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MissingUsersCard({ users }: { users: MissingUser[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <UserX className="w-4 h-4 text-orange-500" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          Chưa khai báo ({users.length})
        </h3>
      </div>
      {users.length === 0 ? (
        <p className="p-4 text-sm text-gray-400 dark:text-gray-500">
          Tất cả nhân viên đã khai báo ít nhất 1 buổi 🎉
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {users.map((u) => (
            <li key={u.userId} className="px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
                0 buổi
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
