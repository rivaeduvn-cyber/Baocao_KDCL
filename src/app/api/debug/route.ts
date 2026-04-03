import { NextResponse } from "next/server";

export async function GET() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || "not set";
  const httpsUrl = tursoUrl.replace("libsql://", "https://");

  // Direct HTTP request to Turso
  try {
    const res = await fetch(httpsUrl + "/v2/pipeline", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.TURSO_AUTH_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql: "SELECT id, email, name, role FROM User" } },
          { type: "close" },
        ],
      }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, nodeVersion: process.version, data });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, nodeVersion: process.version, error: String(e) });
  }
}
