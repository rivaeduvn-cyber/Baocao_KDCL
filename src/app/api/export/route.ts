import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAttendances, findAttachmentsByAttendanceIds, AttendanceWithUser } from "@/lib/db";
import { resolveAttendanceScope } from "@/lib/org-tree";
import { registerVietnameseFont } from "@/lib/pdf-fonts";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Có mặt",
  ABSENT: "Vắng",
  LATE: "Trễ",
  LEAVE: "Nghỉ phép",
};

const SESSION_LABEL: Record<string, string> = {
  MORNING: "Sáng",
  AFTERNOON: "Chiều",
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = await resolveAttendanceScope(session.user);
  // Chỉ Admin/VT/GD/TBP — STAFF không export tổng hợp
  if (scope !== null && scope.length <= 1) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const format = searchParams.get("format") || "excel";
  const month = searchParams.get("month");
  const userId = searchParams.get("userId");

  const where: { userId?: string; userIds?: string[]; month?: string } = {};
  if (month) where.month = month;
  if (userId) {
    if (scope !== null && !scope.includes(userId)) {
      return NextResponse.json({ error: "Không có quyền xuất nhân viên này" }, { status: 403 });
    }
    where.userId = userId;
  } else if (scope !== null) {
    where.userIds = scope;
  }

  const attendances = await findAttendances(where, { includeUser: true, orderBy: "asc" }) as AttendanceWithUser[];

  const attendanceIds = attendances.map((a) => a.id);
  const allAttachments = await findAttachmentsByAttendanceIds(attendanceIds);
  const attachmentMap = new Map<string, string[]>();
  for (const att of allAttachments) {
    const list = attachmentMap.get(att.attendanceId) || [];
    list.push(att.fileUrl);
    attachmentMap.set(att.attendanceId, list);
  }

  if (format === "excel") {
    return buildExcel(attendances, attachmentMap, month);
  }
  if (format === "pdf") {
    return buildPdf(attendances, attachmentMap, month);
  }
  return NextResponse.json({ error: "Format không hỗ trợ" }, { status: 400 });
}

async function buildExcel(
  attendances: AttendanceWithUser[],
  attachmentMap: Map<string, string[]>,
  month: string | null
) {
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

  for (const a of attendances) {
    const fileUrls = attachmentMap.get(a.id) || [];
    sheet.addRow({
      name: a.user.name,
      email: a.user.email,
      date: a.date,
      session: SESSION_LABEL[a.session] || a.session,
      status: STATUS_LABEL[a.status] || a.status,
      workReport: a.workReport || "",
      attachments: fileUrls.join("\n"),
    });
  }

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

async function buildPdf(
  attendances: AttendanceWithUser[],
  attachmentMap: Map<string, string[]>,
  month: string | null
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  await registerVietnameseFont(doc);

  doc.setFont("Roboto", "bold");
  doc.setFontSize(16);
  doc.text(`Báo cáo chấm công${month ? " - " + month : ""}`, 40, 40);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  doc.text(`Tổng: ${attendances.length} bản ghi`, 40, 58);

  const rows = attendances.map((a) => {
    const fileCount = (attachmentMap.get(a.id) || []).length;
    return [
      a.user.name,
      a.date,
      SESSION_LABEL[a.session] || a.session,
      STATUS_LABEL[a.status] || a.status,
      a.workReport || "",
      fileCount > 0 ? String(fileCount) : "-",
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [["Nhân viên", "Ngày", "Buổi", "Trạng thái", "Công việc", "File"]],
    body: rows,
    styles: { font: "Roboto", fontStyle: "normal", fontSize: 9, cellPadding: 4, overflow: "linebreak" },
    headStyles: { font: "Roboto", fontStyle: "bold", fillColor: [68, 114, 196], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 70 },
      2: { cellWidth: 50 },
      3: { cellWidth: 70 },
      4: { cellWidth: 380 },
      5: { cellWidth: 40, halign: "center" },
    },
  });

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=bao-cao-${month || "all"}.pdf`,
    },
  });
}
