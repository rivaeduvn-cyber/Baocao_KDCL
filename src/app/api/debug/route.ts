import { NextResponse } from "next/server";

export async function GET() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || "not set";

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client");
    const client = createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const result = await client.execute("SELECT id, email, name, role FROM User");
    return NextResponse.json({ ok: true, rows: result.rows });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
