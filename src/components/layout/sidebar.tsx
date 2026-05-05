"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Clock, FileText, Users, ClipboardList, BarChart3, MailQuestion, Settings, GitBranch, UsersRound,
  LogOut, Menu, X, ChevronLeft, ChevronRight,
} from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: "pendingEditRequests" | "pendingReviews";
}

/** Build sidebar links based on role + level. */
function buildLinks(role?: string, level?: string | null): { menu: NavLink[]; admin: NavLink[]; adminLabel: string } {
  const isAdmin = role === "ADMIN";
  const isVT = level === "VIEN_TRUONG";
  const hasSubordinates = level === "VIEN_TRUONG" || level === "GIAM_DOC" || level === "TRUONG_BO_PHAN";

  const menu: NavLink[] = [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  ];

  // Admin role không cần chấm công cá nhân; những user có level (kể cả VT) thì cần
  if (!isAdmin) {
    menu.push(
      { href: "/attendance", label: "Chấm công", icon: Clock },
      { href: "/reports", label: "Báo cáo của tôi", icon: FileText },
      { href: "/my-edit-requests", label: "Yêu cầu sửa của tôi", icon: MailQuestion },
    );
  }

  // Cấp trên (VT/GD/TBP) thấy menu xem cấp dưới
  if (hasSubordinates) {
    menu.push({ href: "/my-team", label: "Cấp dưới của tôi", icon: UsersRound, badgeKey: "pendingReviews" });
  }

  menu.push({ href: "/settings", label: "Cài đặt", icon: Settings });

  // Admin section
  const admin: NavLink[] = [];
  if (isAdmin || isVT) {
    admin.push({ href: "/admin/users", label: "Quản lý nhân viên", icon: Users });
    admin.push({ href: "/admin/org-chart", label: "Cây tổ chức", icon: GitBranch });
    admin.push({ href: "/admin/attendance", label: "Chấm công tổng hợp", icon: ClipboardList });
    admin.push({ href: "/admin/reports", label: "Báo cáo tổng hợp", icon: BarChart3 });
  }
  if (isAdmin) {
    admin.push({ href: "/admin/edit-requests", label: "Yêu cầu sửa", icon: MailQuestion, badgeKey: "pendingEditRequests" });
  }

  const adminLabel = isAdmin ? "Quản trị" : "Lãnh đạo";
  return { menu, admin, adminLabel };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingEditRequests, setPendingEditRequests] = useState(0);
  const isAdmin = session?.user?.role === "ADMIN";
  const userLevel = session?.user?.level;
  const hasSubordinates = userLevel === "VIEN_TRUONG" || userLevel === "GIAM_DOC" || userLevel === "TRUONG_BO_PHAN";
  const { menu: employeeLinks, admin: adminLinks, adminLabel } = buildLinks(
    session?.user?.role,
    userLevel
  );
  const [pendingReviews, setPendingReviews] = useState(0);

  useEffect(() => {
    if (!isAdmin && !hasSubordinates) return;
    let cancelled = false;
    async function poll() {
      const calls: Promise<void>[] = [];
      if (isAdmin) {
        calls.push(
          fetch("/api/edit-requests?status=PENDING")
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => { if (!cancelled) setPendingEditRequests(Array.isArray(d) ? d.length : 0); })
            .catch(() => {})
        );
      }
      if (isAdmin || hasSubordinates) {
        calls.push(
          fetch("/api/attendance/pending-review-count")
            .then((r) => (r.ok ? r.json() : { count: 0 }))
            .then((d) => { if (!cancelled) setPendingReviews(Number(d.count) || 0); })
            .catch(() => {})
        );
      }
      await Promise.all(calls);
    }
    poll();
    const interval = setInterval(poll, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAdmin, hasSubordinates, pathname]);

  const badges: Record<string, number> = { pendingEditRequests, pendingReviews };

  const initials = session?.user?.name
    ?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">
              K
            </div>
            <h2 className="font-bold text-lg">KĐCL</h2>
          </div>
        )}
        <button
          onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
          className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-gray-800 transition-colors hidden md:block"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-gray-400 hover:text-white p-1.5 md:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Menu
          </p>
        )}
        {employeeLinks.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          const badge = link.badgeKey ? badges[link.badgeKey] : 0;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 relative",
                active
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-gray-400 hover:bg-gray-800/70 hover:text-white"
              )}
              title={link.label}
            >
              <div className="relative shrink-0">
                <Icon className="w-5 h-5" />
                {collapsed && badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1">{link.label}</span>
                  {badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] text-center">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}

        {adminLinks.length > 0 && (
          <>
            {!collapsed && (
              <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-4">
                {adminLabel}
              </p>
            )}
            {adminLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname.startsWith(link.href);
              const badge = link.badgeKey ? badges[link.badgeKey] : 0;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 relative",
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-gray-400 hover:bg-gray-800/70 hover:text-white"
                  )}
                  title={link.label}
                >
                  <div className="relative shrink-0">
                    <Icon className="w-5 h-5" />
                    {collapsed && badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1">{link.label}</span>
                      {badge > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] text-center">
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700/50">
        {!collapsed && session?.user && (
          <div className="mb-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-800/70 rounded-lg transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-40 p-2 rounded-lg bg-gray-900 text-white shadow-lg md:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex bg-gray-900 text-white flex-col transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
