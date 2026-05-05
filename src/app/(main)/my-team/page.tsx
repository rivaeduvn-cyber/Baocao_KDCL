"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { LEVEL_LABEL, LEVEL_RANK } from "@/lib/org-tree";
import { getCurrentMonth } from "@/lib/utils";
import AttendanceTable from "@/components/attendance-table";
import { ChevronRight, Users } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  level: string | null;
  managerId: string | null;
  position: string | null;
}

export default function MyTeamPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [month, setMonth] = useState(getCurrentMonth());

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  // Tính cấp dưới đệ quy phía client từ danh sách user
  const myId = session?.user?.id;
  const subordinates = useMemo(() => {
    if (!myId) return [];
    return collectSubordinatesFlat(myId, users);
  }, [myId, users]);

  // Group theo level
  const grouped = useMemo(() => {
    const map = new Map<string, User[]>();
    for (const u of subordinates) {
      const key = u.level || "OTHER";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    return Array.from(map.entries()).sort(
      (a, b) => (LEVEL_RANK[a[0]] ?? 99) - (LEVEL_RANK[b[0]] ?? 99)
    );
  }, [subordinates]);

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Cấp dưới của tôi</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Xem báo cáo công việc của các cấp dưới trực tiếp và gián tiếp
        </p>
      </div>

      {subordinates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
          <Users className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Chưa có cấp dưới nào</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="space-y-4">
              {grouped.map(([level, list]) => (
                <div key={level}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {LEVEL_LABEL[level] || "Khác"} ({list.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {list.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id === selectedUserId ? "" : u.id)}
                        className={`flex items-center justify-between gap-2 p-3 rounded-lg border text-left transition-all ${
                          selectedUserId === u.id
                            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800"
                            : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-900"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {u.position || u.email}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                          selectedUserId === u.id ? "rotate-90 text-blue-500" : ""
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              {selectedUserId
                ? `Báo cáo của ${users.find((u) => u.id === selectedUserId)?.name || ""}`
                : "Báo cáo toàn team"}
            </h3>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>

          <AttendanceTable
            month={month}
            userId={selectedUserId || undefined}
            showReport
            showUser={!selectedUserId}
          />
        </>
      )}
    </div>
  );
}

function collectSubordinatesFlat(rootId: string, users: User[]): User[] {
  const childrenByManager = new Map<string, User[]>();
  for (const u of users) {
    if (!u.managerId) continue;
    if (!childrenByManager.has(u.managerId)) childrenByManager.set(u.managerId, []);
    childrenByManager.get(u.managerId)!.push(u);
  }

  const result: User[] = [];
  const stack: string[] = [rootId];
  const visited = new Set<string>();
  while (stack.length > 0) {
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
}
