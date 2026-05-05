"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, CircleDot } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 60_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  async function fetchData() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setUnread(data.unread);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    fetchData();
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    fetchData();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 px-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[480px] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Thông báo</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400 dark:text-gray-500">
                Chưa có thông báo nào
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      !n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read ? (
                        <CircleDot className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                            {formatRelative(n.createdAt)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">
                            {n.body}
                          </p>
                        )}
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => { setOpen(false); if (!n.read) markOneRead(n.id); }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                          >
                            Xem chi tiết →
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}n`;
  return new Date(iso).toLocaleDateString("vi-VN");
}
