"use client";

import { useEffect, useState } from "react";

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

    setForm({ name: "", email: "", password: "", role: "EMPLOYEE" });
    setShowForm(false);
    setEditUser(null);
    fetchUsers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn chắc chắn muốn xóa nhân viên này?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
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

  if (loading) return <div className="text-gray-500">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý nhân viên</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          + Thêm nhân viên
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-3">
          <h3 className="font-semibold text-gray-700">
            {editUser ? "Sửa nhân viên" : "Thêm nhân viên mới"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text" placeholder="Họ tên" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm" required
            />
            <input
              type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm" required
            />
            <input
              type="password" placeholder={editUser ? "Mật khẩu mới (bỏ trống để giữ nguyên)" : "Mật khẩu"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              required={!editUser}
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="EMPLOYEE">Nhân viên</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
              {editUser ? "Cập nhật" : "Tạo"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditUser(null); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Họ tên</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Email</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Vai trò</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    {user.role === "ADMIN" ? "Admin" : "Nhân viên"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(user)} className="text-blue-600 hover:underline text-xs">Sửa</button>
                  <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:underline text-xs">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
