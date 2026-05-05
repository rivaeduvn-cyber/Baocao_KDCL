import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findTaskById, updateTaskStatus, deleteTask,
  maybeAutoCompleteParent, createNotification,
} from "@/lib/db";

/**
 * PATCH /api/tasks/[id] — Assignee update progress
 * Body: { status: "IN_PROGRESS" | "SUBMITTED", result?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await findTaskById(id);
  if (!task) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (task.assigneeId !== session.user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { status, result } = await req.json();
  if (!["IN_PROGRESS", "SUBMITTED"].includes(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }
  if (status === "SUBMITTED" && (!result || !result.trim())) {
    return NextResponse.json({ error: "Cần ghi rõ kết quả khi nộp việc" }, { status: 400 });
  }

  const updated = await updateTaskStatus(id, {
    status,
    ...(result !== undefined && { result: result?.trim() || null }),
  });

  if (status === "SUBMITTED") {
    await createNotification({
      userId: task.assignerId,
      type: "TASK_SUBMITTED",
      title: `Việc "${task.title}" đã được nộp`,
      body: result?.trim()?.slice(0, 100) || null,
      link: "/team-tasks",
    });
  }

  return NextResponse.json(updated);
}

/**
 * PUT /api/tasks/[id]/review — Assigner xác nhận hoàn thành hoặc reopen
 * Body: { decision: "COMPLETED" | "REOPENED", reviewNote?: string }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await findTaskById(id);
  if (!task) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (task.assignerId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Chỉ người giao mới review được" }, { status: 403 });
  }
  if (task.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Chỉ review task đã nộp" }, { status: 400 });
  }

  const { decision, reviewNote } = await req.json();
  if (!["COMPLETED", "REOPENED"].includes(decision)) {
    return NextResponse.json({ error: "Quyết định không hợp lệ" }, { status: 400 });
  }
  if (decision === "REOPENED" && (!reviewNote || !reviewNote.trim())) {
    return NextResponse.json({ error: "Reopen bắt buộc có lý do" }, { status: 400 });
  }

  const updated = await updateTaskStatus(id, {
    status: decision,
    reviewNote: reviewNote?.trim() || null,
  });

  // Notify assignee
  await createNotification({
    userId: task.assigneeId,
    type: decision === "COMPLETED" ? "TASK_COMPLETED" : "TASK_REOPENED",
    title: decision === "COMPLETED"
      ? `Việc "${task.title}" đã được công nhận hoàn thành`
      : `Việc "${task.title}" cần làm lại`,
    body: reviewNote?.trim() || null,
    link: "/my-tasks",
  });

  // Auto-complete parent nếu all subtask done
  if (decision === "COMPLETED" && task.parentId) {
    const completedParent = await maybeAutoCompleteParent(task.parentId);
    if (completedParent) {
      const parent = await findTaskById(task.parentId);
      if (parent) {
        await createNotification({
          userId: parent.assignerId,
          type: "TASK_COMPLETED",
          title: `Việc "${parent.title}" tự động hoàn thành`,
          body: "Tất cả subtask đã xong.",
          link: "/team-tasks",
        });
      }
    }
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/tasks/[id] — Assigner cancel task chưa SUBMITTED
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await findTaskById(id);
  if (!task) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (task.assignerId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Chỉ người giao mới hủy được" }, { status: 403 });
  }
  if (task.status === "COMPLETED") {
    return NextResponse.json({ error: "Không thể xóa task đã hoàn thành" }, { status: 400 });
  }

  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
