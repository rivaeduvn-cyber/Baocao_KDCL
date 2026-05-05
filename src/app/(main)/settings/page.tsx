"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Save } from "lucide-react";
import { useToast } from "@/components/toast";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("Mật khẩu xác nhận không khớp", "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/users/me/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Lỗi đổi mật khẩu", "error");
      return;
    }

    toast("Đổi mật khẩu thành công");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Cài đặt tài khoản</h2>

      <section className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Thông tin</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Họ tên</dt>
            <dd className="text-gray-800 dark:text-gray-200 font-medium">{session?.user?.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="text-gray-800 dark:text-gray-200 font-medium">{session?.user?.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Vai trò</dt>
            <dd className="text-gray-800 dark:text-gray-200 font-medium">
              {session?.user?.role === "ADMIN" ? "Admin" : "Nhân viên"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Đổi mật khẩu
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mật khẩu mới <span className="text-xs text-gray-400">(tối thiểu 6 ký tự)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-all shadow-md shadow-blue-600/30"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </section>
    </div>
  );
}
