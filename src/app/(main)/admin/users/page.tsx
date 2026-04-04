"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { UserPlus, Pencil, Trash2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" });
  const [error, setError] = useState("");
  const { toast } = useToast();

  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
    const method = editUser ? "PUT" : "POST";
    const body = editUser
      ? { name: form.name, email: form.email, role: form.role, ...(form.password && { password: form.password }) }
      : form;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Lỗi xử lý");
      return;
    }

    toast(editUser ? "Cập nhật thành công" : "Thêm nhân viên thành công");
    setForm({ name: "", email: "", password: "", role: "EMPLOYEE" });
    setShowForm(false);
    setEditUser(null);
    fetchUsers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn chắc chắn muốn xóa nhân viên này?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    toast("Đã xóa nhân viên");
    fetchUsers();
  }

  function openEdit(user: User) {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setShowForm(true);
  }

  function openCreate() {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "EMPLOYEE" });
    setShowForm(true);
  }

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>;

  const inputClass = "px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản lý nhân viên</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all shadow-md shadow-blue-600/30"
        >
          <UserPlus className="w-4 h-4" />
          Thêm nhân viên
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-4 transition-colors">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">
            {editUser ? "Sửa nhân viên" : "Thêm nhân viên mới"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Họ tên" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass} required />
            <input type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass} required />
            <input type="password"
              placeholder={editUser ? "Mật khẩu mới (bỏ trống để giữ nguyên)" : "Mật khẩu"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass} required={!editUser} />
            <select value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}>
              <option value="EMPLOYEE">Nhân viên</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium transition-all">
              {editUser ? "Cập nhật" : "Tạo"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditUser(null); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Họ tên</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vai trò</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{user.name}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                  }`}>
                    {user.role === "ADMIN" ? "Admin" : "Nhân viên"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(user)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors" title="Sửa">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(user.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
