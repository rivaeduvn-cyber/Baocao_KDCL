"use client";

import { useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-800">
        Hệ thống Chấm công & Báo cáo Công việc
      </h1>
      {session?.user && (
        <div className="text-sm text-gray-500">
          Xin chào, <span className="font-medium text-gray-700">{session.user.name}</span>
        </div>
      )}
    </header>
  );
}
