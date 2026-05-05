"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, ClipboardList } from "lucide-react";
import TaskCard, { TaskRow, isOverdue } from "@/components/task-card";
import TaskDetailModal from "@/components/task-detail-modal";
import TaskCreateModal from "@/components/task-create-modal";

const TABS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: "ACTIVE", label: "Đang chạy", statuses: ["ASSIGNED", "IN_PROGRESS", "REOPENED"] },
  { key: "AWAITING", label: "Chờ xác nhận", statuses: ["SUBMITTED"] },
  { key: "DONE", label: "Hoàn thành", statuses: ["COMPLETED"] },
  { key: "CANCELLED", label: "Đã hủy", statuses: ["CANCELLED"] },
];

export default function TeamTasksPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState("AWAITING");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function fetchTasks() {
    setLoading(true);
    // Hiển thị task mình đã giao (assigned-by-me) — top-level only để tránh trùng subtask
    const res = await fetch("/api/tasks?mode=assigned-by-me");
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchTasks(); }, [refreshKey]);

  const filtered = tasks.filter((t) => {
    const tabDef = TABS.find((x) => x.key === tab)!;
    return tabDef.statuses.includes(t.status);
  });

  const awaitingCount = tasks.filter((t) => t.status === "SUBMITTED").length;
  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Giao việc</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Việc bạn đã giao cho cấp dưới
            {awaitingCount > 0 && (
              <span className="ml-2 text-purple-600 dark:text-purple-400 font-medium">
                · {awaitingCount} chờ xác nhận
              </span>
            )}
            {overdueCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">· {overdueCount} quá hạn</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-md shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          Giao việc mới
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map((t) => {
          const count = tasks.filter((x) => t.statuses.includes(x.status)).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
            <TaskCard key={t.id} task={t} perspective="assigner" onClick={() => setSelected(t)} />
          ))}
        </div>
      )}

      {creating && (
        <TaskCreateModal
          scopeUserId={session?.user?.id}
          onClose={() => setCreating(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {selected && (
        <TaskDetailModal
          task={selected}
          perspective="assigner"
          onClose={() => setSelected(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
