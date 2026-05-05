import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, updateUser } from "@/lib/db";
import bcrypt from "bcryptjs";

const MIN_LENGTH = 6;

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Thiếu mật khẩu" }, { status: 400 });
  }
  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json({ error: `Mật khẩu mới tối thiểu ${MIN_LENGTH} ký tự` }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "Mật khẩu mới phải khác mật khẩu hiện tại" }, { status: 400 });
  }

  const user = await findUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 10);
  await updateUser(session.user.id, { password: hashed });

  return NextResponse.json({ ok: true });
}
