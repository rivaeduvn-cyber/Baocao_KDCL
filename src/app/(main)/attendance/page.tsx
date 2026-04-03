"use client";

import { useState } from "react";
import { getTodayString } from "@/lib/utils";
import AttendanceForm from "@/components/attendance-form";
import AttendanceTable from "@/components/attendance-table";

export default function AttendancePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSuccess() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Chấm công</h2>
      <AttendanceForm defaultDate={getTodayString()} onSuccess={handleSuccess} />
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Lịch sử chấm công
        </h3>
        <AttendanceTable key={refreshKey} ownOnly />
      </div>
    </div>
  );
}
