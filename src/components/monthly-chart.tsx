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
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">
        Thống kê theo tháng
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="present" name="Có mặt" fill="#22c55e" />
          <Bar dataKey="absent" name="Vắng" fill="#ef4444" />
          <Bar dataKey="late" name="Đi trễ" fill="#eab308" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
