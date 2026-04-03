"use client";

import { useState } from "react";

interface Props {
  defaultDate: string;
  onSuccess: () => void;
}

export default function AttendanceForm({ defaultDate, onSuccess }: Props) {
  const [date, setDate] = useState(defaultDate);
  const [session, setSession] = useState("MORNING");
  const [status, setStatus] = useState("PRESENT");
  const [workReport, setWorkReport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, session, status, workReport }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Lỗi xử lý");
      return;
    }

    setSuccess("Chấm công thành công!");
    setWorkReport("");
    onSuccess();
    setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buổi</label>
          <div className="flex gap-3 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" name="session" value="MORNING"
                checked={session === "MORNING"}
                onChange={(e) => setSession(e.target.value)}
                className="text-blue-600"
              />
              <span className="text-sm">Sáng</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" name="session" value="AFTERNOON"
                checked={session === "AFTERNOON"}
                onChange={(e) => setSession(e.target.value)}
                className="text-blue-600"
              />
              <span className="text-sm">Chiều</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="PRESENT">Có mặt</option>
            <option value="LATE">Đi trễ</option>
            <option value="ABSENT">Vắng</option>
            <option value="LEAVE">Nghỉ phép</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Công việc thực hiện
        </label>
        <textarea
          value={workReport}
          onChange={(e) => setWorkReport(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Mô tả công việc đang thực hiện trong buổi làm việc..."
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
      >
        {loading ? "Đang gửi..." : "Chấm công"}
      </button>
    </form>
  );
}
