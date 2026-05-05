import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateUser, deleteUser, findUserById } from "@/lib/db";
import { LEVELS, validateManagerAssignment, getSubordinatesRecursive } from "@/lib/org-tree";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name) data.name = body.name;
  if (body.email) data.email = body.email;
  if (body.role) data.role = body.role;
  if (body.password) data.password = await bcrypt.hash(body.password, 10);
  if (body.position !== undefined) data.position = body.position || null;

  if (body.level !== undefined) {
    if (body.level && !LEVELS.includes(body.level)) {
      return NextResponse.json({ error: "Cấp không hợp lệ" }, { status: 400 });
    }
    data.level = body.level || null;
  }

  if (body.managerId !== undefined) {
    const proposed = body.managerId || null;
    const err = await validateManagerAssignment(id, proposed);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    data.managerId = proposed;
  }

  const user = await updateUser(id, data);
  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  const user = await findUserById(id);
  if (!user) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // Block delete if user has subordinates — must reassign first
  const subs = await getSubordinatesRecursive(id);
  if (subs.length > 0) {
    return NextResponse.json(
      { error: `Không thể xóa: có ${subs.length} cấp dưới đang trực thuộc. Hãy chuyển cấp dưới sang người khác trước.` },
      { status: 400 }
    );
  }

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
