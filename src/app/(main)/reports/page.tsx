"use client";

import { useState } from "react";
import { getCurrentMonth } from "@/lib/utils";
import AttendanceTable from "@/components/attendance-table";

export default function ReportsPage() {
  const [month, setMonth] = useState(getCurrentMonth());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Báo cáo công việc của tôi
        </h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        />
      </div>
      <AttendanceTable month={month} showReport ownOnly canEdit />
    </div>
  );
}
