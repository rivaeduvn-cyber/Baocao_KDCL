"use client";

import { useState } from "react";
import { getCurrentMonth } from "@/lib/utils";
import AttendanceTable from "@/components/attendance-table";

export default function AdminAttendancePage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoaded(true); });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Chấm công tổng hợp</h2>
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
      <AttendanceTable month={month} userId={userId} showReport showUser admin />
    </div>
  );
}
