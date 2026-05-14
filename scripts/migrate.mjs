/**
 * Apply the full database setup (schema + RLS + seed) over a direct
 * Postgres connection.
 *
 * Usage — provide the connection string from the Supabase dashboard
 * (Project Settings -> Database -> Connection string -> URI):
 *
 *   SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres" \
 *     node scripts/migrate.mjs
 *
 * Runs supabase/setup.sql as a single transaction. Requires the `pg`
 * package (npm install pg).
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

const sql = readFileSync(new URL("../supabase/setup.sql", import.meta.url), "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected. Applying supabase/setup.sql …");
  await client.query(sql);
  console.log("Done — schema, RLS and seed data applied.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
