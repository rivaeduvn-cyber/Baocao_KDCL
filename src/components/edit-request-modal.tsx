"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import { useToast } from "@/components/toast";

interface Props {
  attendanceId: string;
  currentStatus: string;
  currentWorkReport: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function EditRequestModal({
  attendanceId,
  currentStatus,
  currentWorkReport,
  onClose,
  onSubmitted,
}: Props) {
  const [proposedStatus, setProposedStatus] = useState(currentStatus);
  const [proposedReport, setProposedReport] = useState(currentWorkReport ?? "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      toast("Vui lòng nhập lý do", "error");
      return;
    }
    setSubmitting(true);

    // Only send fields that changed
    const body: Record<string, unknown> = { attendanceId, reason };
    if (proposedStatus !== currentStatus) body.proposedStatus = proposedStatus;
    if (proposedReport !== (currentWorkReport ?? "")) body.proposedReport = proposedReport;

    const res = await fetch("/api/edit-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Lỗi khi gửi yêu cầu", "error");
      return;
    }

    toast("Đã gửi yêu cầu sửa, chờ admin duyệt");
    onSubmitted();
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
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Yêu cầu sửa bản ghi</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Bản ghi đã quá hạn 3 ngày, cần admin duyệt
            </p>
          </div>
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
              Trạng thái đề xuất
            </label>
            <select
              value={proposedStatus}
              onChange={(e) => setProposedStatus(e.target.value)}
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
              Công việc đề xuất
            </label>
            <textarea
              value={proposedReport}
              onChange={(e) => setProposedReport(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lý do <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Vì sao cần sửa?"
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
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium transition-all"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
