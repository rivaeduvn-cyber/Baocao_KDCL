import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findTasks, createTask, findTaskById, findUserById, createNotification } from "@/lib/db";
import { isManagerOf, getSubordinatesRecursive } from "@/lib/org-tree";

/**
 * GET /api/tasks
 *
 * Query params:
 *   - mode: "assigned-to-me" (default cho user) | "assigned-by-me" (cấp trên xem việc đã giao) | "team" (cấp trên xem all task của cấp dưới đệ quy)
 *   - status: filter cụ thể
 *   - parentId: subtasks của task X (truyền id) hoặc top-level (truyền "null")
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") || "assigned-to-me";
  const status = sp.get("status") || undefined;
  const parentIdParam = sp.get("parentId");
  const filter: Parameters<typeof findTasks>[0] = {};

  if (mode === "assigned-to-me") {
    filter.assigneeId = session.user.id;
  } else if (mode === "assigned-by-me") {
    filter.assignerId = session.user.id;
  } else if (mode === "team") {
    const subs = await getSubordinatesRecursive(session.user.id);
    if (subs.length === 0) return NextResponse.json([]);
    filter.assigneeIds = subs;
  } else {
    return NextResponse.json({ error: "mode không hợp lệ" }, { status: 400 });
  }

  if (status) filter.status = status;
  if (parentIdParam !== null) {
    filter.parentId = parentIdParam === "null" ? null : parentIdParam;
  }

  const tasks = await findTasks(filter);
  return NextResponse.json(tasks);
}

/**
 * POST /api/tasks — Giao việc cho cấp dưới.
 *
 * Quy tắc:
 *   - Phải là cấp trên (đệ quy) của assignee, hoặc Admin/VT
 *   - Subtask: parentId không null → assigner của subtask = assignee của parent
 *     hoặc cấp trên cao hơn; assignee của subtask phải là cấp dưới của parent's assignee.
 *     Subtask của subtask không cho (max depth 2).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { parentId, title, description, assigneeId, priority, dueDate } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Thiếu tiêu đề" }, { status: 400 });
  }
  if (!assigneeId) {
    return NextResponse.json({ error: "Thiếu người được giao" }, { status: 400 });
  }
  if (assigneeId === session.user.id) {
    return NextResponse.json({ error: "Không thể tự giao việc cho chính mình" }, { status: 400 });
  }

  // Validate subtask depth
  let parent = null;
  if (parentId) {
    parent = await findTaskById(parentId);
    if (!parent) return NextResponse.json({ error: "Không tìm thấy task cha" }, { status: 404 });
    if (parent.parentId) {
      return NextResponse.json({ error: "Không hỗ trợ subtask cấp 3 (max 2 cấp)" }, { status: 400 });
    }
    // Người tạo subtask: assignee của parent (chia nhỏ task của mình)
    if (parent.assigneeId !== session.user.id) {
      return NextResponse.json({ error: "Chỉ người được giao parent task mới chia subtask" }, { status: 403 });
    }
  }

  // Validate manager relationship
  const isAdmin = session.user.role === "ADMIN";
  const isVT = session.user.level === "VIEN_TRUONG";
  let canAssign = isAdmin || isVT;
  if (!canAssign) {
    canAssign = await isManagerOf(session.user.id, assigneeId);
  }
  if (!canAssign) {
    return NextResponse.json({ error: "Chỉ giao việc cho cấp dưới của mình" }, { status: 403 });
  }

  // Admin role không nên có position trong task (giả định KISS) — bỏ qua, chấp nhận
  const task = await createTask({
    parentId: parentId || null,
    title: title.trim(),
    description: description?.trim() || null,
    assignerId: session.user.id,
    assigneeId,
    priority: priority || "NORMAL",
    dueDate: dueDate || null,
  });

  // Notify assignee
  await createNotification({
    userId: assigneeId,
    type: "TASK_ASSIGNED",
    title: parentId
      ? `Subtask mới: ${task.title}`
      : `Bạn được giao việc mới: ${task.title}`,
    body: description?.trim() || null,
    link: "/my-tasks",
  });

  return NextResponse.json(task, { status: 201 });
}
