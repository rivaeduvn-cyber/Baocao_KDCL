import { NextResponse } from "next/server";
import { findAllUsers } from "@/lib/db";

export async function GET() {
  try {
    const users = await findAllUsers();
    return NextResponse.json({ ok: true, users });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e), stack: (e as Error).stack?.split("\n").slice(0, 5) });
  }
}
