import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";
import {
  findAttendanceById,
  findAttachmentsByAttendanceId,
  countAttachmentsByAttendanceId,
  createAttachment,
} from "@/lib/db";
import {
  MAX_FILES, MAX_SIZE_BYTES, MAX_SIZE_MB, isAllowedMime, ALLOWED_HINT,
} from "@/lib/upload-constraints";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const attendanceId = formData.get("attendanceId") as string;
  const files = formData.getAll("files") as File[];

  if (!attendanceId) {
    return NextResponse.json({ error: "Thiếu attendanceId" }, { status: 400 });
  }

  if (!files.length) {
    return NextResponse.json({ error: "Không có file" }, { status: 400 });
  }

  // Verify attendance ownership
  const attendance = await findAttendanceById(attendanceId);
  if (!attendance) {
    return NextResponse.json({ error: "Không tìm thấy bản ghi chấm công" }, { status: 404 });
  }
  if (session.user.role !== "ADMIN" && attendance.userId !== session.user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  // Check file count limit
  const currentCount = await countAttachmentsByAttendanceId(attendanceId);
  if (currentCount + files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Tối đa ${MAX_FILES} file. Hiện có ${currentCount}, thêm ${files.length} vượt giới hạn.` },
      { status: 400 }
    );
  }

  // Validate size + type
  for (const file of files) {
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File "${file.name}" vượt quá ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }
    if (!isAllowedMime(file.type)) {
      return NextResponse.json(
        { error: `File "${file.name}" không thuộc loại được hỗ trợ (${ALLOWED_HINT})` },
        { status: 400 }
      );
    }
  }

  // Upload files
  const attachments = [];
  for (const file of files) {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `attendance/${attendanceId}/${Date.now()}-${sanitizedName}`;

    const blob = await put(path, file, { access: "public" });

    const attachment = await createAttachment({
      attendanceId,
      fileName: file.name,
      fileUrl: blob.url,
      fileSize: file.size,
      fileType: file.type || "application/octet-stream",
    });
    attachments.push(attachment);
  }

  return NextResponse.json({ attachments }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attendanceId = req.nextUrl.searchParams.get("attendanceId");
  if (!attendanceId) {
    return NextResponse.json({ error: "Thiếu attendanceId" }, { status: 400 });
  }

  // Verify ownership
  const attendance = await findAttendanceById(attendanceId);
  if (!attendance) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  if (session.user.role !== "ADMIN" && attendance.userId !== session.user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const attachments = await findAttachmentsByAttendanceId(attendanceId);
  return NextResponse.json(attachments);
}
