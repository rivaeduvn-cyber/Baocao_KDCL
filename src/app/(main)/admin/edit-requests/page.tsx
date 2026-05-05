"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock } from "lucide-react";
import { useToast } from "@/components/toast";
import { formatDate, getSessionLabel, getStatusLabel } from "@/lib/utils";

interface EditRequest {
  id: string;
  attendanceId: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
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

const TABS: Array<{ key: string; label: string }> = [
  { key: "PENDING", label: "Đang chờ" },
  { key: "APPROVED", label: "Đã duyệt" },
  { key: "REJECTED", label: "Từ chối" },
];

export default function AdminEditRequestsPage() {
  const [tab, setTab] = useState("PENDING");
  const [rows, setRows] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchRows() {
    setLoading(true);
    const res = await fetch(`/api/edit-requests?status=${tab}`);
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleDecision(id: string, decision: "APPROVED" | "REJECTED") {
    const reviewNote = decision === "REJECTED"
      ? prompt("Lý do từ chối (tuỳ chọn):") || ""
      : "";

    const res = await fetch(`/api/edit-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reviewNote }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Lỗi xử lý", "error");
      return;
    }
    toast(decision === "APPROVED" ? "Đã duyệt và áp dụng" : "Đã từ chối");
    fetchRows();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Yêu cầu sửa bản ghi</h2>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500">
          Đang tải...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500">
          Không có yêu cầu nào
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <RequestCard key={r.id} req={r} onDecide={handleDecision} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  req,
  onDecide,
}: {
  req: EditRequest;
  onDecide: (id: string, decision: "APPROVED" | "REJECTED") => void;
}) {
  const isPending = req.status === "PENDING";
  const statusChanged = req.proposedStatus && req.proposedStatus !== req.currentStatus;
  const reportChanged = req.proposedReport !== null && req.proposedReport !== (req.currentReport ?? "");

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
        <div>
          <p className="font-medium text-gray-800 dark:text-gray-200">{req.requesterName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{req.requesterEmail}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">
            {formatDate(req.attendanceDate)} · {getSessionLabel(req.attendanceSession)}
          </span>
        </div>
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

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 mb-3">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Lý do</p>
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{req.reason}</p>
      </div>

      {req.reviewNote && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Ghi chú duyệt</p>
          <p className="text-sm text-gray-800 dark:text-gray-200">{req.reviewNote}</p>
        </div>
      )}

      {isPending ? (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onDecide(req.id, "REJECTED")}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-medium transition-all"
          >
            <X className="w-4 h-4" />
            Từ chối
          </button>
          <button
            onClick={() => onDecide(req.id, "APPROVED")}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium transition-all"
          >
            <Check className="w-4 h-4" />
            Duyệt
          </button>
        </div>
      ) : (
        <div className="text-right">
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
              req.status === "APPROVED"
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
            }`}
          >
            {req.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
          </span>
        </div>
      )}
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
