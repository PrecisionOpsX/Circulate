/**
 * Apply database SQL over a direct Postgres connection.
 *
 * Usage - provide the connection string from the Supabase dashboard
 * (Project Settings -> Database -> Connection string -> URI):
 *
 *   # Fresh project: full setup (schema + RLS + seed)
 *   SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres" \
 *     node scripts/migrate.mjs
 *
 *   # Existing project: apply a single migration file
 *   SUPABASE_DB_URL="..." node scripts/migrate.mjs 0003_marketplace.sql
 *
 * Each file runs inside a single transaction. Requires the `pg` package
 * (npm install pg).
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error(
    "Missing SUPABASE_DB_URL. Get it from Supabase dashboard -> " +
      "Project Settings -> Database -> Connection string (URI).",
  );
  process.exit(1);
}

// Optional arg: a migration filename under supabase/migrations/.
// With no arg, run the full fresh-project setup.
const arg = process.argv[2];
const relativePath = arg
  ? `../supabase/migrations/${arg}`
  : "../supabase/setup.sql";

let sql;
try {
  sql = readFileSync(new URL(relativePath, import.meta.url), "utf8");
} catch {
  console.error(`Could not read ${relativePath}. Check the filename.`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Connected. Applying ${arg ?? "supabase/setup.sql"} ...`);
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log("Done.");
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
