import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@company.com" },
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json({ ok: true, user, env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL || "not set",
    }});
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
