import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json({ ok: true, users });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e), stack: (e as Error).stack?.split("\n").slice(0, 5) });
  }
}
