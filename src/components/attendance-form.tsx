"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { Send, CalendarDays } from "lucide-react";

interface Props {
  defaultDate: string;
  onSuccess: () => void;
}

export default function AttendanceForm({ defaultDate, onSuccess }: Props) {
  const [date, setDate] = useState(defaultDate);
  const [session, setSession] = useState("MORNING");
  const [status, setStatus] = useState("PRESENT");
  const [workReport, setWorkReport] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, session, status, workReport }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      toast(data.error || "Lỗi xử lý", "error");
      return;
    }

    toast("Chấm công thành công!");
    setWorkReport("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-4 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <CalendarDays className="w-4 h-4 inline mr-1" />
            Ngày
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buổi</label>
          <div className="flex gap-2 mt-1">
            {[
              { value: "MORNING", label: "Sáng" },
              { value: "AFTERNOON", label: "Chiều" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSession(opt.value)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  session === opt.value
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="PRESENT">Có mặt</option>
            <option value="LATE">Đi trễ</option>
            <option value="ABSENT">Vắng</option>
            <option value="LEAVE">Nghỉ phép</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Công việc thực hiện
        </label>
        <textarea
          value={workReport}
          onChange={(e) => setWorkReport(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          placeholder="Mô tả công việc đang thực hiện trong buổi làm việc..."
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-all shadow-md shadow-blue-600/30"
      >
        <Send className="w-4 h-4" />
        {loading ? "Đang gửi..." : "Chấm công"}
      </button>
    </form>
  );
}
