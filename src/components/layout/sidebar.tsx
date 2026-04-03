"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const employeeLinks = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/attendance", label: "Chấm công" },
  { href: "/reports", label: "Báo cáo của tôi" },
];

const adminLinks = [
  { href: "/admin/users", label: "Quản lý nhân viên" },
  { href: "/admin/attendance", label: "Chấm công tổng hợp" },
  { href: "/admin/reports", label: "Báo cáo tổng hợp" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <aside
      className={cn(
        "bg-gray-900 text-white flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!collapsed && <h2 className="font-bold text-lg">KĐCL</h2>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white p-1"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {!collapsed && (
          <p className="px-3 py-1 text-xs text-gray-400 uppercase">Menu</p>
        )}
        {employeeLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block px-3 py-2 rounded-md text-sm transition-colors",
              pathname === link.href
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            title={link.label}
          >
            {collapsed ? link.label.charAt(0) : link.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 py-1 text-xs text-gray-400 uppercase mt-4">
                Quản trị
              </p>
            )}
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm transition-colors",
                  pathname.startsWith(link.href)
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
                title={link.label}
              >
                {collapsed ? link.label.charAt(0) : link.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700">
        {!collapsed && session?.user && (
          <div className="mb-2">
            <p className="text-sm font-medium">{session.user.name}</p>
            <p className="text-xs text-gray-400">{session.user.email}</p>
            <p className="text-xs text-blue-400">
              {isAdmin ? "Admin" : "Nhân viên"}
            </p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-md transition-colors text-left"
        >
          {collapsed ? "X" : "Đăng xuất"}
        </button>
      </div>
    </aside>
  );
}
