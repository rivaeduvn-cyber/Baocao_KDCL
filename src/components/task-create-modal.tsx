"use client";

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { useToast } from "@/components/toast";
import { LEVEL_LABEL } from "@/lib/org-tree";

interface User {
  id: string;
  name: string;
  email: string;
  level: string | null;
  managerId: string | null;
}

interface Props {
  parentTaskId?: string | null;
  /** When provided, locks assignee selection to this user (used for subtasks) */
  forcedAssigneeId?: string;
  /** When provided, only show subordinates of this user as candidates (subtask: parent assignee's subordinates) */
  scopeUserId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function TaskCreateModal({
  parentTaskId, forcedAssigneeId, scopeUserId, onClose, onCreated,
}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(forcedAssigneeId || "");
  const [priority, setPriority] = useState("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (forcedAssigneeId) return; // not needed
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [forcedAssigneeId]);

  // Filter candidates: subordinates of scopeUserId (recursive client-side)
  const candidates = (() => {
    if (forcedAssigneeId) return users.filter((u) => u.id === forcedAssigneeId);
    if (!scopeUserId) return users;
    const childrenByManager = new Map<string, User[]>();
    for (const u of users) {
      if (!u.managerId) continue;
      if (!childrenByManager.has(u.managerId)) childrenByManager.set(u.managerId, []);
      childrenByManager.get(u.managerId)!.push(u);
    }
    const result: User[] = [];
    const stack = [scopeUserId];
    const visited = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const kids = childrenByManager.get(cur) || [];
      for (const k of kids) {
        if (!visited.has(k.id)) {
          result.push(k);
          stack.push(k.id);
        }
      }
    }
    return result;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !assigneeId) {
      toast("Cần nhập tiêu đề và chọn người được giao", "error");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId: parentTaskId || null,
        title: title.trim(),
        description: description.trim() || null,
        assigneeId,
        priority,
        dueDate: dueDate || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Lỗi tạo task", "error");
      return;
    }
    toast("Đã giao việc");
    onCreated();
    onClose();
  }

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

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
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            {parentTaskId ? "Tạo subtask" : "Giao việc mới"}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <input type="text" placeholder="Tiêu đề *" value={title}
            onChange={(e) => setTitle(e.target.value)} required className={inputClass} />

          <textarea placeholder="Mô tả chi tiết..." value={description}
            onChange={(e) => setDescription(e.target.value)} rows={3}
            className={`${inputClass} resize-none`} />

          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
            required disabled={!!forcedAssigneeId} className={inputClass}>
            <option value="">— Chọn người được giao —</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.level ? `(${LEVEL_LABEL[u.level] || u.level})` : ""}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
              <option value="LOW">Thấp</option>
              <option value="NORMAL">Bình thường</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className={inputClass} title="Hạn chót (tuỳ chọn)" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600">
              Hủy
            </button>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
              <Plus className="w-4 h-4" />
              {submitting ? "Đang tạo..." : "Giao việc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
