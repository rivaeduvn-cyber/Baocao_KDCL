"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatDate, getSessionLabel, getStatusLabel } from "@/lib/utils";

interface EditRequest {
  id: string;
  attendanceId: string;
  attendanceDate: string;
  attendanceSession: string;
  currentStatus: string;
  currentReport: string | null;
  proposedStatus: string | null;
  proposedReport: string | null;
  reason: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Đang chờ",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export default function MyEditRequestsPage() {
  const [rows, setRows] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/edit-requests")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Yêu cầu sửa của tôi</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Lịch sử các yêu cầu sửa bản ghi quá hạn 3 ngày
        </p>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500">
          Đang tải...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500">
          Bạn chưa gửi yêu cầu nào
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <RequestCard key={r.id} req={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req }: { req: EditRequest }) {
  const statusChanged = req.proposedStatus && req.proposedStatus !== req.currentStatus;
  const reportChanged = req.proposedReport !== null && req.proposedReport !== (req.currentReport ?? "");

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">
            {formatDate(req.attendanceDate)} · {getSessionLabel(req.attendanceSession)}
          </span>
        </div>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[req.status] || ""}`}>
          {STATUS_LABEL[req.status] || req.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <ChangeBlock
          label="Trạng thái"
          before={getStatusLabel(req.currentStatus)}
          after={req.proposedStatus ? getStatusLabel(req.proposedStatus) : null}
          changed={!!statusChanged}
        />
        <ChangeBlock
          label="Công việc"
          before={req.currentReport || "(trống)"}
          after={reportChanged ? (req.proposedReport || "(trống)") : null}
          changed={reportChanged}
        />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 mb-2">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Lý do của tôi</p>
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{req.reason}</p>
      </div>

      {req.reviewNote && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Phản hồi của admin</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{req.reviewNote}</p>
        </div>
      )}

      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-right">
        Gửi lúc: {new Date(req.createdAt).toLocaleString("vi-VN")}
        {req.reviewedAt && ` · Duyệt lúc: ${new Date(req.reviewedAt).toLocaleString("vi-VN")}`}
      </p>
    </div>
  );
}

function ChangeBlock({
  label,
  before,
  after,
  changed,
}: {
  label: string;
  before: string;
  after: string | null;
  changed: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      {changed && after ? (
        <div className="text-sm space-y-0.5">
          <p className="text-gray-500 dark:text-gray-400 line-through">{before}</p>
          <p className="text-blue-600 dark:text-blue-400 font-medium">→ {after}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-800 dark:text-gray-200">{before}</p>
      )}
    </div>
  );
}
