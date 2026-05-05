import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAllUsers, findUserByEmail, createUser } from "@/lib/db";
import { LEVELS } from "@/lib/org-tree";
import bcrypt from "bcryptjs";

/** GET — Admin role hoặc Viện trưởng đều xem được full list */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const isVienTruong = session.user.level === "VIEN_TRUONG";
  if (!isAdmin && !isVienTruong) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const users = await findAllUsers();
  return NextResponse.json(users);
}

/** POST — Chỉ Admin role được tạo user mới */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { name, email, password, role, level, managerId, position } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  if (level && !LEVELS.includes(level)) {
    return NextResponse.json({ error: "Cấp không hợp lệ" }, { status: 400 });
  }

  const exists = await findUserByEmail(email);
  if (exists) {
    return NextResponse.json({ error: "Email đã tồn tại" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await createUser({
    name,
    email,
    password: hashedPassword,
    role: role || "EMPLOYEE",
    level: level || null,
    managerId: managerId || null,
    position: position || null,
  });

  return NextResponse.json(user, { status: 201 });
}
