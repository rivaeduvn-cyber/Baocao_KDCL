import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { del } from "@vercel/blob";
import { findAttachmentById, findAttendanceById, deleteAttachment } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attachment = await findAttachmentById(id);
  if (!attachment) {
    return NextResponse.json({ error: "Không tìm thấy file" }, { status: 404 });
  }

  // Verify ownership
  const attendance = await findAttendanceById(attachment.attendanceId);
  if (attendance && session.user.role !== "ADMIN" && attendance.userId !== session.user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  // Delete from Vercel Blob
  try {
    await del(attachment.fileUrl);
  } catch {
    // File may already be deleted from blob, continue
  }

  // Delete DB record
  await deleteAttachment(id);

  return NextResponse.json({ ok: true });
}
