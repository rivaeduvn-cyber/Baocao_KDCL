"use client";

import { useState } from "react";
import { X, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/toast";
import { formatDate, getSessionLabel } from "@/lib/utils";

interface AttendanceForReview {
  id: string;
  date: string;
  session: string;
  workReport: string | null;
  reviewStatus: string | null;
  reviewComment: string | null;
  user?: { name: string; email: string };
  userName?: string;
}

interface Props {
  attendance: AttendanceForReview;
  onClose: () => void;
  onReviewed: () => void;
}

const DECISIONS = [
  {
    key: "APPROVED" as const,
    label: "Đạt",
    icon: CheckCircle,
    color: "bg-green-600 hover:bg-green-700",
    description: "Báo cáo đáp ứng yêu cầu",
  },
  {
    key: "NEEDS_REVISION" as const,
    label: "Cần bổ sung",
    icon: AlertCircle,
    color: "bg-orange-600 hover:bg-orange-700",
    description: "Yêu cầu nhân viên sửa lại — bypass giới hạn 3 ngày",
  },
  {
    key: "REJECTED" as const,
    label: "Không đạt",
    icon: XCircle,
    color: "bg-red-600 hover:bg-red-700",
    description: "Báo cáo không đạt yêu cầu",
  },
];

export default function ReviewModal({ attendance, onClose, onReviewed }: Props) {
  const [decision, setDecision] = useState<"APPROVED" | "NEEDS_REVISION" | "REJECTED" | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const isOverride = attendance.reviewStatus !== "PENDING";
  const userName = attendance.user?.name || attendance.userName || "—";

  async function handleSubmit() {
    if (!decision) {
      toast("Chọn quyết định", "error");
      return;
    }
    if (isOverride && !comment.trim()) {
      toast("Override bắt buộc phải có lý do", "error");
      return;
    }
    if (decision === "NEEDS_REVISION" && !comment.trim()) {
      toast('Cần ghi rõ "cần bổ sung gì"', "error");
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/attendance/${attendance.id}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comment: comment.trim() || null }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Lỗi khi duyệt", "error");
      return;
    }
    toast("Đã ghi nhận quyết định");
    onReviewed();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">
              Duyệt báo cáo {isOverride ? "(Override)" : ""}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {userName} · {formatDate(attendance.date)} · {getSessionLabel(attendance.session)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Nội dung báo cáo
            </p>
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {attendance.workReport || <span className="text-gray-400">(Không có nội dung)</span>}
            </div>
          </div>

          {isOverride && attendance.reviewComment && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Quyết định trước đó
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{attendance.reviewComment}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Quyết định {isOverride && <span className="text-red-500">* (override bắt buộc lý do)</span>}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {DECISIONS.map((d) => {
                const Icon = d.icon;
                const selected = decision === d.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => setDecision(d.key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      selected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${
                      d.key === "APPROVED" ? "text-green-500" :
                      d.key === "NEEDS_REVISION" ? "text-orange-500" : "text-red-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{d.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Ghi chú {(decision === "NEEDS_REVISION" || isOverride) && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Phản hồi cho nhân viên..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !decision}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
              decision === "APPROVED" ? "bg-green-600 hover:bg-green-700" :
              decision === "NEEDS_REVISION" ? "bg-orange-600 hover:bg-orange-700" :
              decision === "REJECTED" ? "bg-red-600 hover:bg-red-700" :
              "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {submitting ? "Đang gửi..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
