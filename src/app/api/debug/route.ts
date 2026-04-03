import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL || "not set";
  const token = process.env.TURSO_AUTH_TOKEN ? "set (length: " + process.env.TURSO_AUTH_TOKEN.length + ")" : "not set";

  // Test libsql connection directly
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client/web");
    const client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const result = await client.execute("SELECT 1 as test");
    return NextResponse.json({ ok: true, url: url.substring(0, 30) + "...", token, dbTest: result.rows });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, url: url.substring(0, 30) + "...", token, error: String(e) });
  }
}
