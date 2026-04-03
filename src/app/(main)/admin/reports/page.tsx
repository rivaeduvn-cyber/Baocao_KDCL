"use client";

import { useState } from "react";
import { getCurrentMonth } from "@/lib/utils";
import AttendanceTable from "@/components/attendance-table";

export default function AdminReportsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (!loaded) {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoaded(true); });
  }

  async function handleExport(format: string) {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format, month });
      if (userId) params.set("userId", userId);
      const res = await fetch(`/api/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bao-cao-${month}.${format === "excel" ? "xlsx" : "pdf"}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Báo cáo tổng hợp</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("excel")}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
          >
            Xuất Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
          >
            Xuất PDF
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Tất cả nhân viên</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <AttendanceTable month={month} userId={userId} showReport showUser />
    </div>
  );
}
