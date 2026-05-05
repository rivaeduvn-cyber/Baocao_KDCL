"use client";

import { useState, useEffect } from "react";
import { X, Send, Check, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { formatDate } from "@/lib/utils";
import type { TaskRow } from "@/components/task-card";
import { STATUS_LABEL, PRIORITY_LABEL } from "@/components/task-card";

interface Props {
  task: TaskRow;
  perspective: "assignee" | "assigner";
  onClose: () => void;
  onChanged: () => void;
  onCreateSubtask?: () => void;
}

export default function TaskDetailModal({
  task, perspective, onClose, onChanged, onCreateSubtask,
}: Props) {
  const [result, setResult] = useState(task.result || "");
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subtasks, setSubtasks] = useState<TaskRow[]>([]);
  const { toast } = useToast();

  // Load subtasks if this is a parent task
  useEffect(() => {
    if (task.parentId) return; // not a parent
    fetch(`/api/tasks?mode=${perspective === "assignee" ? "assigned-to-me" : "assigned-by-me"}&parentId=${task.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSubtasks(Array.isArray(data) ? data : []));
  }, [task.id, task.parentId, perspective]);

  async function handleStartProgress() {
    setSubmitting(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast("Lỗi cập nhật", "error");
      return;
    }
    toast("Đã bắt đầu");
    onChanged();
    onClose();
  }

  async function handleSubmitWork() {
    if (!result.trim()) {
      toast("Cần ghi rõ kết quả", "error");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUBMITTED", result: result.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Lỗi nộp việc", "error");
      return;
    }
    toast("Đã nộp việc");
    onChanged();
    onClose();
  }

  async function handleReview(decision: "COMPLETED" | "REOPENED") {
    if (decision === "REOPENED" && !reviewNote.trim()) {
      toast("Reopen cần ghi lý do", "error");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reviewNote: reviewNote.trim() || null }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Lỗi review", "error");
      return;
    }
    toast(decision === "COMPLETED" ? "Đã công nhận hoàn thành" : "Đã reopen");
    onChanged();
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hủy task này?")) return;
    setSubmitting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Lỗi hủy", "error");
      return;
    }
    toast("Đã hủy task");
    onChanged();
    onClose();
  }

  const isAssignee = perspective === "assignee";
  const isAssigner = perspective === "assigner";
  const canStart = isAssignee && task.status === "ASSIGNED";
  const canSubmit = isAssignee && ["IN_PROGRESS", "REOPENED"].includes(task.status);
  const canReview = isAssigner && task.status === "SUBMITTED";
  const canDelete = isAssigner && task.status !== "COMPLETED";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">{task.title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Trạng thái" value={STATUS_LABEL[task.status] || task.status} />
            <Field label="Độ ưu tiên" value={PRIORITY_LABEL[task.priority] || task.priority} />
            <Field label="Người giao" value={task.assignerName} />
            <Field label="Người làm" value={task.assigneeName} />
            <Field label="Hạn chót" value={task.dueDate ? formatDate(task.dueDate) : "—"} />
            <Field label="Đã nộp" value={task.submittedAt ? formatDate(String(task.submittedAt).slice(0, 10)) : "—"} />
          </dl>

          {task.description && (
            <Section title="Mô tả">
              <p className="whitespace-pre-wrap">{task.description}</p>
            </Section>
          )}

          {task.result && (
            <Section title="Kết quả của assignee">
              <p className="whitespace-pre-wrap">{task.result}</p>
            </Section>
          )}

          {task.reviewNote && (
            <Section
              title={task.status === "REOPENED" ? "Yêu cầu sửa" : "Ghi chú duyệt"}
              tone={task.status === "REOPENED" ? "orange" : "gray"}
            >
              <p className="whitespace-pre-wrap">{task.reviewNote}</p>
            </Section>
          )}

          {/* Subtask list (only for parent tasks) */}
          {!task.parentId && subtasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Subtasks ({subtasks.filter((s) => s.status === "COMPLETED").length}/{subtasks.length} hoàn thành)
              </p>
              <ul className="space-y-1.5">
                {subtasks.map((s) => (
                  <li key={s.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{s.title}</span>
                    <span className="text-xs text-gray-500">{STATUS_LABEL[s.status] || s.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Inputs theo perspective + status */}
          {canSubmit && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Kết quả nộp <span className="text-red-500">*</span>
              </label>
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Mô tả những gì đã làm xong..."
              />
            </div>
          )}

          {canReview && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Ghi chú review <span className="text-gray-400">(bắt buộc khi reopen)</span>
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end p-4 border-t border-gray-200 dark:border-gray-800">
          {/* Assignee có thể tạo subtask nếu parent task chưa SUBMIT/COMPLETED */}
          {isAssignee && !task.parentId && onCreateSubtask &&
           !["SUBMITTED", "COMPLETED", "CANCELLED"].includes(task.status) && (
            <button
              onClick={onCreateSubtask}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Plus className="w-4 h-4" />
              Tạo subtask
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="flex items-center gap-1 px-3 py-2 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-900 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Hủy task
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStartProgress}
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 font-medium disabled:opacity-50"
            >
              Bắt đầu làm
            </button>
          )}
          {canSubmit && (
            <button
              onClick={handleSubmitWork}
              disabled={submitting}
              className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-medium disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Đang nộp..." : "Nộp việc"}
            </button>
          )}
          {canReview && (
            <>
              <button
                onClick={() => handleReview("REOPENED")}
                disabled={submitting}
                className="flex items-center gap-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 font-medium disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Reopen
              </button>
              <button
                onClick={() => handleReview("COMPLETED")}
                disabled={submitting}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Hoàn thành
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{value}</dd>
    </div>
  );
}

function Section({ title, children, tone = "gray" }: { title: string; children: React.ReactNode; tone?: "gray" | "orange" }) {
  const toneClass = tone === "orange"
    ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
    : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800";
  return (
    <div className={`p-3 rounded-lg border ${toneClass} text-sm text-gray-800 dark:text-gray-200`}>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      {children}
    </div>
  );
}
