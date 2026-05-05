"use client";

import { useEffect, useState } from "react";
import TaskCard, { TaskRow, isOverdue } from "@/components/task-card";
import TaskDetailModal from "@/components/task-detail-modal";
import TaskCreateModal from "@/components/task-create-modal";
import { ClipboardList } from "lucide-react";

const TABS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: "TODO", label: "Cần làm", statuses: ["ASSIGNED", "IN_PROGRESS", "REOPENED"] },
  { key: "SUBMITTED", label: "Đã nộp", statuses: ["SUBMITTED"] },
  { key: "DONE", label: "Hoàn thành", statuses: ["COMPLETED"] },
];

export default function MyTasksPage() {
  const [tab, setTab] = useState("TODO");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [creatingSubtaskFor, setCreatingSubtaskFor] = useState<TaskRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function fetchTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks?mode=assigned-to-me");
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchTasks(); }, [refreshKey]);

  const filtered = tasks.filter((t) => {
    const tabDef = TABS.find((x) => x.key === tab)!;
    return tabDef.statuses.includes(t.status);
  });

  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Việc của tôi</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Việc được giao bởi cấp trên
            {overdueCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">· {overdueCount} việc quá hạn</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => {
          const count = tasks.filter((x) => t.statuses.includes(x.status)).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-400">
          Đang tải...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-10 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Không có việc nào trong mục này</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} perspective="assignee" onClick={() => setSelected(t)} />
          ))}
        </div>
      )}

      {selected && (
        <TaskDetailModal
          task={selected}
          perspective="assignee"
          onClose={() => setSelected(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
          onCreateSubtask={() => {
            setCreatingSubtaskFor(selected);
            setSelected(null);
          }}
        />
      )}

      {creatingSubtaskFor && (
        <TaskCreateModal
          parentTaskId={creatingSubtaskFor.id}
          scopeUserId={creatingSubtaskFor.assigneeId}
          onClose={() => setCreatingSubtaskFor(null)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
