"use client";

import { Calendar, Flag, User, ChevronRight, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface TaskRow {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  assignerName: string;
  assigneeName: string;
  priority: string;
  dueDate: string | null;
  status: string;
  result: string | null;
  reviewNote: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Mới giao",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  COMPLETED: "Hoàn thành",
  REOPENED: "Cần làm lại",
  CANCELLED: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  SUBMITTED: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  REOPENED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-gray-400",
  NORMAL: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

export function isOverdue(task: TaskRow): boolean {
  if (!task.dueDate) return false;
  if (["COMPLETED", "CANCELLED"].includes(task.status)) return false;
  const today = new Date().toISOString().split("T")[0];
  return task.dueDate < today;
}

interface Props {
  task: TaskRow;
  perspective: "assignee" | "assigner";
  onClick?: () => void;
}

export default function TaskCard({ task, perspective, onClick }: Props) {
  const overdue = isOverdue(task);
  const otherParty = perspective === "assignee" ? task.assignerName : task.assigneeName;
  const otherLabel = perspective === "assignee" ? "Giao bởi" : "Người làm";

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left bg-white dark:bg-gray-900 rounded-xl border p-4 transition-all ${
        onClick ? "hover:border-blue-300 dark:hover:border-blue-800 cursor-pointer" : "cursor-default"
      } ${overdue ? "border-red-300 dark:border-red-900" : "border-gray-200 dark:border-gray-800"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {task.parentId && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                Subtask
              </span>
            )}
            <h4 className="font-medium text-gray-800 dark:text-gray-100">{task.title}</h4>
          </div>
          {task.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[task.status] || ""}`}>
            {STATUS_LABEL[task.status] || task.status}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded">
              <AlertTriangle className="w-3 h-3" />
              Quá hạn
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          {otherLabel}: <span className="font-medium text-gray-700 dark:text-gray-300">{otherParty}</span>
        </span>
        {task.dueDate && (
          <span className={`flex items-center gap-1 ${overdue ? "text-red-500 dark:text-red-400 font-medium" : ""}`}>
            <Calendar className="w-3.5 h-3.5" />
            Hạn: {formatDate(task.dueDate)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Flag className={`w-3.5 h-3.5 ${PRIORITY_COLORS[task.priority]}`} />
          {PRIORITY_LABEL[task.priority] || task.priority}
        </span>
        {onClick && <ChevronRight className="w-4 h-4 ml-auto" />}
      </div>

      {task.reviewNote && task.status === "REOPENED" && (
        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded text-xs text-gray-700 dark:text-gray-300">
          <span className="font-semibold text-orange-700 dark:text-orange-400">Yêu cầu sửa: </span>
          {task.reviewNote}
        </div>
      )}
    </button>
  );
}

export { STATUS_LABEL, PRIORITY_LABEL };
