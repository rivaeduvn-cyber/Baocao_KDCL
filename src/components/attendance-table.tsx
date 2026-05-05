"use client";

import { useEffect, useState } from "react";
import { formatDate, getSessionLabel, getStatusLabel, getCurrentMonth, isWithinEditWindow, EDIT_WINDOW_DAYS } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { Trash2, Paperclip, ChevronDown, ChevronUp, Pencil, MailQuestion } from "lucide-react";
import AttachmentList from "@/components/attachment-list";
import AttendanceEditModal from "@/components/attendance-edit-modal";
import EditRequestModal from "@/components/edit-request-modal";

interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

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
  canEdit?: boolean;
  onChange?: () => void;
}

export default function AttendanceTable({
  month,
  userId,
  showReport = false,
  showUser = false,
  admin = false,
  ownOnly = false,
  canEdit = false,
  onChange,
}: Props) {
  const [data, setData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [loadingAttachments, setLoadingAttachments] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Attendance | null>(null);
  const [requestTarget, setRequestTarget] = useState<Attendance | null>(null);
  const { toast } = useToast();

  async function fetchData() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("month", month || getCurrentMonth());
    if (userId) params.set("userId", userId);
    if (ownOnly) params.set("ownOnly", "true");

    const res = await fetch(`/api/attendance?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, userId, ownOnly]);

  async function toggleAttachments(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!attachments[id]) {
      setLoadingAttachments(id);
      const res = await fetch(`/api/upload?attendanceId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setAttachments((prev) => ({ ...prev, [id]: data }));
      }
      setLoadingAttachments(null);
    }
  }

  async function handleDeleteAttachment(attachmentId: string, attendanceId: string) {
    if (!confirm("Xóa file này?")) return;
    const res = await fetch(`/api/upload/${attachmentId}`, { method: "DELETE" });
    if (res.ok) {
      setAttachments((prev) => ({
        ...prev,
        [attendanceId]: prev[attendanceId]?.filter((a) => a.id !== attachmentId) || [],
      }));
      toast("Đã xóa file");
    } else {
      toast("Lỗi khi xóa file", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa bản ghi này?")) return;
    const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
    if (res.ok) {
      setData((d) => d.filter((item) => item.id !== id));
      toast("Đã xóa bản ghi");
      onChange?.();
    } else {
      toast("Lỗi khi xóa", "error");
    }
  }

  function handleSaved() {
    fetchData();
    onChange?.();
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

  const showActions = admin || canEdit;

  return (
    <>
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
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Paperclip className="w-3.5 h-3.5 inline" />
                </th>
                {showActions && <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((item) => (
                <>
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
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAttachments(item.id)}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950"
                        title="Xem file đính kèm"
                      >
                        {expandedId === item.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                    {showActions && (
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          // Admin always can act; others only within edit window
                          const canAct = admin || isWithinEditWindow(item.date);
                          if (!canAct) {
                            return (
                              <button
                                onClick={() => setRequestTarget(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900 transition-colors"
                                title={`Quá hạn ${EDIT_WINDOW_DAYS} ngày — gửi yêu cầu để admin duyệt`}
                              >
                                <MailQuestion className="w-3.5 h-3.5" />
                                Yêu cầu sửa
                              </button>
                            );
                          }
                          return (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditTarget(item)}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                                title="Sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    )}
                  </tr>
                  {expandedId === item.id && (
                    <tr key={`${item.id}-files`}>
                      <td colSpan={10} className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/20">
                        {loadingAttachments === item.id ? (
                          <p className="text-xs text-gray-400">Đang tải file...</p>
                        ) : attachments[item.id]?.length ? (
                          <AttachmentList
                            attachments={attachments[item.id]}
                            canDelete={admin || !showUser}
                            onDelete={(attachmentId) => handleDeleteAttachment(attachmentId, item.id)}
                          />
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500">Không có file đính kèm</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <AttendanceEditModal
          attendanceId={editTarget.id}
          initialStatus={editTarget.status}
          initialWorkReport={editTarget.workReport}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {requestTarget && (
        <EditRequestModal
          attendanceId={requestTarget.id}
          currentStatus={requestTarget.status}
          currentWorkReport={requestTarget.workReport}
          onClose={() => setRequestTarget(null)}
          onSubmitted={() => {/* nothing to refresh — request is async */}}
        />
      )}
    </>
  );
}
