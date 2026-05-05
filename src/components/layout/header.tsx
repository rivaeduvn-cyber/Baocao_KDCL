"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import NotificationBell from "@/components/notification-bell";

export default function Header() {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between transition-colors">
      <div className="pl-10 md:pl-0">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Hệ thống Chấm công & Báo cáo
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {session?.user && <NotificationBell />}
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={theme === "light" ? "Chế độ tối" : "Chế độ sáng"}
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
        {session?.user && (
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block ml-2">
            Xin chào, <span className="font-medium text-gray-700 dark:text-gray-200">{session.user.name}</span>
          </span>
        )}
      </div>
    </header>
  );
}
