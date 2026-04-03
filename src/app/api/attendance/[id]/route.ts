import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  if (session.user.role !== "ADMIN" && existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.attendance.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.workReport !== undefined && { workReport: body.workReport }),
    },
  });

  return NextResponse.json(updated);
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
  await prisma.attendance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
