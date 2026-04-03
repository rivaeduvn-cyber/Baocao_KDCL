"use client";

import { useEffect, useState } from "react";
import { formatDate, getSessionLabel, getStatusLabel, getCurrentMonth } from "@/lib/utils";

interface Attendance {
  id: string;
  date: string;
  session: string;
  status: string;
  workReport: string | null;
  user?: { name: string; email: string };
}

interface Props {
  month?: string;
  userId?: string;
  showReport?: boolean;
  showUser?: boolean;
  admin?: boolean;
  ownOnly?: boolean;
}

export default function AttendanceTable({
  month,
  userId,
  showReport = false,
  showUser = false,
  admin = false,
  ownOnly = false,
}: Props) {
  const [data, setData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      else params.set("month", getCurrentMonth());
      if (userId) params.set("userId", userId);
      if (ownOnly) params.set("ownOnly", "true");

      const res = await fetch(`/api/attendance?${params}`);
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    fetchData();
  }, [month, userId, ownOnly]);

  async function handleDelete(id: string) {
    if (!confirm("Xóa bản ghi này?")) return;
    const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
    if (res.ok) setData((d) => d.filter((item) => item.id !== id));
  }

  if (loading) return <div className="text-gray-500 text-sm">Đang tải...</div>;

  if (data.length === 0) {
    return <div className="text-gray-400 text-sm bg-white p-4 rounded-lg shadow">Không có dữ liệu</div>;
  }

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-700",
    ABSENT: "bg-red-100 text-red-700",
    LATE: "bg-yellow-100 text-yellow-700",
    LEAVE: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {showUser && <th className="px-4 py-3 text-left text-gray-600 font-medium">Nhân viên</th>}
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Ngày</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Buổi</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Trạng thái</th>
              {showReport && <th className="px-4 py-3 text-left text-gray-600 font-medium">Công việc</th>}
              {admin && <th className="px-4 py-3 text-right text-gray-600 font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {showUser && <td className="px-4 py-3">{item.user?.name}</td>}
                <td className="px-4 py-3">{formatDate(item.date)}</td>
                <td className="px-4 py-3">{getSessionLabel(item.session)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${statusColors[item.status] || ""}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                {showReport && (
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {item.workReport || "-"}
                  </td>
                )}
                {admin && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline text-xs">
                      Xóa
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
