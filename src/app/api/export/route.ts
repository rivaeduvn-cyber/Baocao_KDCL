import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendances, findAttachmentsByAttendanceIds, AttendanceWithUser } from "@/lib/db";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const format = searchParams.get("format") || "excel";
  const month = searchParams.get("month");
  const userId = searchParams.get("userId");

  const where: { userId?: string; month?: string } = {};
  if (month) where.month = month;
  if (userId) where.userId = userId;

  const attendances = await findAttendances(where, { includeUser: true, orderBy: "asc" }) as AttendanceWithUser[];

  // Fetch all attachments for these attendances
  const attendanceIds = attendances.map((a) => a.id);
  const allAttachments = await findAttachmentsByAttendanceIds(attendanceIds);
  const attachmentMap = new Map<string, string[]>();
  for (const att of allAttachments) {
    const list = attachmentMap.get(att.attendanceId) || [];
    list.push(att.fileUrl);
    attachmentMap.set(att.attendanceId, list);
  }

  if (format === "excel") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Báo cáo");

    sheet.columns = [
      { header: "Nhân viên", key: "name", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Ngày", key: "date", width: 15 },
      { header: "Buổi", key: "session", width: 10 },
      { header: "Trạng thái", key: "status", width: 12 },
      { header: "Công việc", key: "workReport", width: 40 },
      { header: "File đính kèm", key: "attachments", width: 50 },
    ];

    const statusMap: Record<string, string> = {
      PRESENT: "Có mặt", ABSENT: "Vắng", LATE: "Trễ", LEAVE: "Nghỉ phép",
    };

    for (const a of attendances) {
      const fileUrls = attachmentMap.get(a.id) || [];
      sheet.addRow({
        name: a.user.name,
        email: a.user.email,
        date: a.date,
        session: a.session === "MORNING" ? "Sáng" : "Chiều",
        status: statusMap[a.status] || a.status,
        workReport: a.workReport || "",
        attachments: fileUrls.join("\n"),
      });
    }

    // Style header
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=bao-cao-${month || "all"}.xlsx`,
      },
    });
  }

  return NextResponse.json({ error: "Format không hỗ trợ" }, { status: 400 });
}
