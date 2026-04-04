"use client";

import { useEffect, useState } from "react";
import { formatDate, getSessionLabel, getStatusLabel, getCurrentMonth } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { Trash2 } from "lucide-react";

interface Attendance {
  id: string;
  date: string;
  session: string;
  status: string;
  workReport: string | null;
  user?: { name: string; email: string };
  userName?: string;
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
  const { toast } = useToast();

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
    if (res.ok) {
      setData((d) => d.filter((item) => item.id !== id));
      toast("Đã xóa bản ghi");
    } else {
      toast("Lỗi khi xóa", "error");
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
        <div className="animate-pulse text-gray-400 dark:text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-400 dark:text-gray-500">
        Không có dữ liệu
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    ABSENT: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    LATE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
    LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  };

  function getUserName(item: Attendance) {
    return item.user?.name || item.userName || "-";
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {showUser && <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nhân viên</th>}
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buổi</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng thái</th>
              {showReport && <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Công việc</th>}
              {admin && <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                {showUser && <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{getUserName(item)}</td>}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(item.date)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{getSessionLabel(item.session)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || ""}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                {showReport && (
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {item.workReport || <span className="text-gray-300 dark:text-gray-600">-</span>}
                  </td>
                )}
                {admin && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
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
