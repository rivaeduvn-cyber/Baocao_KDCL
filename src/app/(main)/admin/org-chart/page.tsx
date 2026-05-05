"use client";

import { useEffect, useMemo, useState } from "react";
import { LEVEL_LABEL, LEVEL_RANK } from "@/lib/org-tree";
import { Crown, Building2, UserCog, User as UserIcon, AlertTriangle } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  level: string | null;
  managerId: string | null;
  position: string | null;
}

interface TreeNode extends User {
  children: TreeNode[];
}

const LEVEL_ICONS: Record<string, typeof Crown> = {
  VIEN_TRUONG: Crown,
  GIAM_DOC: Building2,
  TRUONG_BO_PHAN: UserCog,
  STAFF: UserIcon,
};

const LEVEL_COLORS: Record<string, string> = {
  VIEN_TRUONG: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  GIAM_DOC: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  TRUONG_BO_PHAN: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  STAFF: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800",
};

export default function OrgChartPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const { roots, orphans, outsiders } = useMemo(() => buildTree(users), [users]);

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Cây tổ chức</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Trực quan hoá hệ thống cấp bậc — từ Viện trưởng xuống Nhân sự bộ phận
        </p>
      </div>

      {roots.length === 0 && orphans.length === 0 && outsiders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500">
          Chưa có nhân viên nào
        </div>
      ) : (
        <>
          {roots.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              {roots.map((node) => <TreeBranch key={node.id} node={node} depth={0} />)}
            </div>
          )}

          {orphans.length > 0 && (
            <Section
              title="Chưa được gán cấp trên"
              hint="Những user có cấp nhưng chưa thuộc nhánh nào (managerId rỗng)"
              warning
            >
              {orphans.map((u) => <UserCard key={u.id} user={u} />)}
            </Section>
          )}

          {outsiders.length > 0 && (
            <Section
              title="Ngoài cây tổ chức"
              hint="Admin role không tham gia nghiệp vụ"
            >
              {outsiders.map((u) => <UserCard key={u.id} user={u} />)}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function buildTree(users: User[]): { roots: TreeNode[]; orphans: User[]; outsiders: User[] } {
  // Outsiders: không có level (Admin role thuần kỹ thuật)
  const outsiders: User[] = users.filter((u) => !u.level);
  const inTree: User[] = users.filter((u) => u.level);

  const byId = new Map<string, TreeNode>();
  for (const u of inTree) byId.set(u.id, { ...u, children: [] });

  const roots: TreeNode[] = [];
  const orphans: User[] = [];
  for (const u of inTree) {
    const node = byId.get(u.id)!;
    if (u.managerId && byId.has(u.managerId)) {
      byId.get(u.managerId)!.children.push(node);
    } else if (!u.managerId) {
      roots.push(node);
    } else {
      // có managerId nhưng không tìm thấy trong inTree → orphan
      orphans.push(u);
    }
  }

  // Sort children theo level rank rồi tên
  function sortNode(n: TreeNode) {
    n.children.sort((a, b) => {
      const ra = LEVEL_RANK[a.level || ""] ?? 99;
      const rb = LEVEL_RANK[b.level || ""] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sortNode);
  }
  roots.forEach(sortNode);
  roots.sort((a, b) => (LEVEL_RANK[a.level || ""] ?? 99) - (LEVEL_RANK[b.level || ""] ?? 99));

  return { roots, orphans, outsiders };
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div className={depth === 0 ? "" : "ml-6 mt-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4"}>
      <UserCard user={node} />
      {node.children.length > 0 && (
        <div className="space-y-2 mt-1">
          {node.children.map((c) => <TreeBranch key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  const Icon = user.level ? (LEVEL_ICONS[user.level] || UserIcon) : UserIcon;
  const colorClass = user.level ? LEVEL_COLORS[user.level] : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";

  return (
    <div className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-lg border ${colorClass}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{user.name}</p>
        <p className="text-[11px] opacity-75 leading-tight">
          {user.position || (user.level ? LEVEL_LABEL[user.level] : "—")}
          {user.role === "ADMIN" && " · Admin"}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  warning,
  children,
}: {
  title: string;
  hint: string;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border p-5 ${
      warning
        ? "border-amber-200 dark:border-amber-900"
        : "border-gray-200 dark:border-gray-800"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {warning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{hint}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
