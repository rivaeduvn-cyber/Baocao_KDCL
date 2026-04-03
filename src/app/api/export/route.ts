import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const where: Record<string, unknown> = {};
  if (month) where.date = { startsWith: month };
  if (userId) where.userId = userId;

  const attendances = await prisma.attendance.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ date: "asc" }, { session: "asc" }],
  });

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
    ];

    const statusMap: Record<string, string> = {
      PRESENT: "Có mặt", ABSENT: "Vắng", LATE: "Trễ", LEAVE: "Nghỉ phép",
    };

    for (const a of attendances) {
      sheet.addRow({
        name: a.user.name,
        email: a.user.email,
        date: a.date,
        session: a.session === "MORNING" ? "Sáng" : "Chiều",
        status: statusMap[a.status] || a.status,
        workReport: a.workReport || "",
      });
    }

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=bao-cao-${month || "all"}.xlsx`,
      },
    });
  }

  // PDF format - return simple HTML-based response for now
  // jspdf with Vietnamese font support is complex server-side, use client-side instead
  return NextResponse.json({ error: "PDF export available from client side" }, { status: 400 });
}
