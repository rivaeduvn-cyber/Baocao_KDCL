"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { useToast } from "@/components/toast";

interface Props {
  attendanceId: string;
  initialStatus: string;
  initialWorkReport: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AttendanceEditModal({
  attendanceId,
  initialStatus,
  initialWorkReport,
  onClose,
  onSaved,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [workReport, setWorkReport] = useState(initialWorkReport ?? "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/attendance/${attendanceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, workReport }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Lỗi khi cập nhật", "error");
      return;
    }

    toast("Đã cập nhật bản ghi");
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Sửa bản ghi chấm công</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="PRESENT">Có mặt</option>
              <option value="LATE">Đi trễ</option>
              <option value="ABSENT">Vắng</option>
              <option value="LEAVE">Nghỉ phép</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Công việc thực hiện
            </label>
            <textarea
              value={workReport}
              onChange={(e) => setWorkReport(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Mô tả công việc..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
