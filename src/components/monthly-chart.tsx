"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MonthlyData {
  month: string;
  present: number;
  absent: number;
  late: number;
}

export default function MonthlyChart({ data }: { data: MonthlyData[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
        Thống kê theo tháng
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
          <YAxis stroke="#9ca3af" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--tooltip-bg, #fff)",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
          <Legend />
          <Bar dataKey="present" name="Có mặt" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="absent" name="Vắng" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="late" name="Đi trễ" fill="#eab308" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
