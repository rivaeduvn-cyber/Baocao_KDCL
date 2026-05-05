import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findNotifications, countUnreadNotifications, markNotificationsRead } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";
  const [items, unread] = await Promise.all([
    findNotifications(session.user.id, { unreadOnly, limit: 30 }),
    countUnreadNotifications(session.user.id),
  ]);

  return NextResponse.json({ items, unread });
}

/** Mark notifications as read. Body: { ids?: string[] } — empty array or omit = mark all */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined;
  await markNotificationsRead(session.user.id, ids);

  return NextResponse.json({ ok: true });
}
