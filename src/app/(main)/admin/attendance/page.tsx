"use client";

import { useEffect, useState } from "react";
import { getCurrentMonth } from "@/lib/utils";
import AttendanceTable from "@/components/attendance-table";
import { FileSpreadsheet, FileText } from "lucide-react";

export default function AdminAttendancePage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
  }, []);

  async function handleExport(format: "excel" | "pdf") {
    setExporting(format);
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
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Chấm công tổng hợp</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("excel")}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-all shadow-md shadow-green-600/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === "excel" ? "Đang xuất..." : "Xuất Excel"}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-all shadow-md shadow-red-600/30"
          >
            <FileText className="w-4 h-4" />
            {exporting === "pdf" ? "Đang xuất..." : "Xuất PDF"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        />
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="">Tất cả nhân viên</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <AttendanceTable
        key={refreshKey}
        month={month}
        userId={userId}
        showReport
        showUser
        admin
        canEdit
        onChange={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
