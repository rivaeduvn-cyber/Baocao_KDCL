// Thin Turso HTTP client for Vercel serverless
const TURSO_URL = (process.env.TURSO_DATABASE_URL || "").replace("libsql://", "https://");
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

interface TursoResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

export async function tursoExecute(
  sql: string,
  args: unknown[] = []
): Promise<TursoResult> {
  const stmtArgs = args.map((a) => {
    if (a === null || a === undefined) return { type: "null" };
    if (typeof a === "number") return { type: "integer", value: String(a) };
    return { type: "text", value: String(a) };
  });

  const res = await fetch(TURSO_URL + "/v2/pipeline", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + TURSO_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: stmtArgs } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso HTTP error: ${res.status}`);
  }

  const data = await res.json();
  const result = data.results?.[0];

  if (result?.type === "error") {
    throw new Error(result.error?.message || "Turso query error");
  }

  const execResult = result?.response?.result;
  if (!execResult) return { columns: [], rows: [], rowsAffected: 0 };

  const cols = execResult.cols.map((c: { name: string }) => c.name);
  const rows = execResult.rows.map((row: { type: string; value: unknown }[]) => {
    const obj: Record<string, unknown> = {};
    row.forEach((cell, i) => {
      obj[cols[i]] = cell.value;
    });
    return obj;
  });

  return {
    columns: cols,
    rows,
    rowsAffected: execResult.affected_row_count || 0,
  };
}
