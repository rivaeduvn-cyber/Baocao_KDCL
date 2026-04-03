import { NextResponse } from "next/server";

export async function GET() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || "not set";

  // Test 1: URL constructor
  let urlTest = "ok";
  try { new URL(tursoUrl); } catch (e) { urlTest = String(e); }

  // Test 2: Replace libsql:// with https://
  const httpsUrl = tursoUrl.replace("libsql://", "https://");
  let httpsUrlTest = "ok";
  try { new URL(httpsUrl); } catch (e) { httpsUrlTest = String(e); }

  // Test 3: Try libsql with https url
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client/web");
    const client = createClient({
      url: httpsUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const result = await client.execute("SELECT 1 as test");
    return NextResponse.json({ ok: true, urlTest, httpsUrlTest, dbTest: result.rows });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, urlTest, httpsUrlTest, error: String(e) });
  }
}
