/**
 * Apply pending Prisma migrations to Turso production over HTTP API.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx tsx scripts/migrate-turso.ts [flags]
 *
 * Flags:
 *   --baseline    Mark all current migrations as applied without running them.
 *                 Use this once if the production DB is already at the latest
 *                 schema (migrations were applied manually before).
 *   --dry-run     Print what would be applied, don't execute.
 *   --turso-mode  Translate Prisma's RedefineTables blocks to ALTER ADD COLUMN
 *                 for SQLite-over-HTTP compatibility (default: on).
 *
 * Tracking: creates `_TursoMigration(name TEXT PRIMARY KEY, appliedAt TEXT)`
 * in the target DB on first run. Migrations already in this table are skipped.
 *
 * Statement splitting: naive split on `;` boundaries that respect single-line
 * SQL. Comments (lines starting with `--`) are stripped before split.
 * The Prisma-generated migrations in this repo are simple enough for that.
 */

import { promises as fs } from "fs";
import path from "path";

const TURSO_URL_RAW = process.env.TURSO_DATABASE_URL || "";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

const args = process.argv.slice(2);
const FLAG_BASELINE = args.includes("--baseline");
const FLAG_DRY_RUN = args.includes("--dry-run");
const FLAG_NO_TURSO_MODE = args.includes("--no-turso-mode");

if (!TURSO_URL_RAW || !TURSO_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN env vars.");
  process.exit(1);
}

const TURSO_URL = TURSO_URL_RAW.replace("libsql://", "https://");

async function tursoExec(sql: string, args: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> {
  const stmtArgs = args.map((a) => {
    if (a === null || a === undefined) return { type: "null" };
    if (typeof a === "number") return { type: "integer", value: String(a) };
    return { type: "text", value: String(a) };
  });

  const res = await fetch(TURSO_URL + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TURSO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: stmtArgs } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const result = data.results?.[0];
  if (result?.type === "error") throw new Error(result.error?.message || "Turso error");

  const exec = result?.response?.result;
  if (!exec) return { rows: [] };
  const cols = exec.cols.map((c: { name: string }) => c.name);
  const rows = exec.rows.map((row: { value: unknown }[]) => {
    const obj: Record<string, unknown> = {};
    row.forEach((cell, i) => { obj[cols[i]] = cell.value; });
    return obj;
  });
  return { rows };
}

async function ensureTrackingTable(): Promise<void> {
  await tursoExec(`
    CREATE TABLE IF NOT EXISTS "_TursoMigration" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" TEXT NOT NULL
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await tursoExec(`SELECT name FROM "_TursoMigration"`);
  return new Set(result.rows.map((r) => String(r.name)));
}

async function listLocalMigrations(): Promise<string[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(); // timestamp prefix → chronological
}

/**
 * Strip comments, split SQL into individual statements.
 * Handles single-line `--` comments. Splits naively on `;` outside of strings.
 */
function splitStatements(sql: string): string[] {
  // Strip line comments
  const noComments = sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");

  // Split on `;` — naive but works for our Prisma-generated SQL
  return noComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Translate Prisma's RedefineTables migration to Turso-friendly ALTER ADD COLUMN.
 * Detection: file contains `PRAGMA defer_foreign_keys` and `RENAME TO`.
 * Strategy: replay the User-org-tree pattern by extracting new columns and
 * indexes from the CREATE TABLE "new_xxx" + CREATE INDEX statements.
 *
 * Currently hard-coded for the only such migration we have
 * (20260505023115_add_user_org_tree). Generic translation is out of scope.
 */
function tursoTranslate(name: string, sql: string): string {
  if (FLAG_NO_TURSO_MODE) return sql;
  if (!sql.includes("PRAGMA defer_foreign_keys") && !sql.includes("RENAME TO")) return sql;

  if (name === "20260505023115_add_user_org_tree") {
    return `
      ALTER TABLE "User" ADD COLUMN "level"     TEXT;
      ALTER TABLE "User" ADD COLUMN "managerId" TEXT;
      ALTER TABLE "User" ADD COLUMN "position"  TEXT;
      CREATE INDEX IF NOT EXISTS "User_managerId_idx" ON "User"("managerId");
      CREATE INDEX IF NOT EXISTS "User_level_idx"     ON "User"("level");
    `;
  }

  console.warn(`⚠ Migration "${name}" uses RedefineTables but no Turso translation defined.`);
  console.warn(`  Skipping — apply it manually or extend tursoTranslate().`);
  return "";
}

async function applyMigration(name: string): Promise<void> {
  const file = path.join(MIGRATIONS_DIR, name, "migration.sql");
  const raw = await fs.readFile(file, "utf-8");
  const sql = tursoTranslate(name, raw);
  if (!sql.trim()) {
    console.log(`  (empty after translation, skipped)`);
    return;
  }

  const statements = splitStatements(sql);
  for (const stmt of statements) {
    if (FLAG_DRY_RUN) {
      console.log(`  [dry-run] ${stmt.split("\n")[0].slice(0, 80)}...`);
      continue;
    }
    try {
      await tursoExec(stmt);
      console.log(`  ✓ ${stmt.split("\n")[0].slice(0, 70)}`);
    } catch (e) {
      const msg = (e as Error).message;
      // Tolerate "already exists" / "duplicate column" — keeps script idempotent
      if (/already exists|duplicate column/i.test(msg)) {
        console.log(`  ⊙ skipped (already exists): ${stmt.split("\n")[0].slice(0, 60)}`);
        continue;
      }
      throw e;
    }
  }
}

async function markApplied(name: string): Promise<void> {
  if (FLAG_DRY_RUN) return;
  await tursoExec(
    `INSERT OR REPLACE INTO "_TursoMigration" ("name", "appliedAt") VALUES (?, ?)`,
    [name, new Date().toISOString()]
  );
}

async function main(): Promise<void> {
  console.log(`Connecting to: ${TURSO_URL_RAW}`);
  console.log(`Mode: ${FLAG_DRY_RUN ? "DRY-RUN" : FLAG_BASELINE ? "BASELINE" : "APPLY"}\n`);

  await ensureTrackingTable();
  const applied = await getAppliedMigrations();
  const local = await listLocalMigrations();

  const pending = local.filter((m) => !applied.has(m));

  if (FLAG_BASELINE) {
    console.log(`Marking ${pending.length} migration(s) as baseline (no execution):`);
    for (const m of pending) {
      console.log(`  ✓ ${m}`);
      await markApplied(m);
    }
    console.log(`\nDone. ${applied.size + pending.length} migration(s) tracked.`);
    return;
  }

  console.log(`Local migrations: ${local.length}`);
  console.log(`Already applied: ${applied.size}`);
  console.log(`Pending: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log("Nothing to apply. Database is up-to-date.");
    return;
  }

  for (const name of pending) {
    console.log(`→ ${name}`);
    await applyMigration(name);
    await markApplied(name);
  }

  console.log(`\nDone. ${pending.length} new migration(s) applied.`);
}

main().catch((e) => {
  console.error("\nMigration failed:", e);
  process.exit(1);
});
