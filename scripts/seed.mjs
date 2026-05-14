/**
 * Seed reference data into Supabase using the service-role key.
 * Idempotent — safe to run repeatedly. Mirrors supabase/seed.sql.
 *
 *   node scripts/seed.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const RESERVE_WALLET_ID = "00000000-0000-0000-0000-000000000001";

const categories = [
  ["Electronics", "electronics", 10],
  ["Furniture", "furniture", 20],
  ["Clothing", "clothing", 30],
  ["Home & Garden", "home-garden", 40],
  ["Books & Media", "books-media", 50],
  ["Toys & Games", "toys-games", 60],
  ["Sports & Outdoors", "sports-outdoors", 70],
  ["Tools", "tools", 80],
  ["Tutoring", "tutoring", 90],
  ["Home Services", "home-services", 100],
  ["Creative & Design", "creative-design", 110],
  ["Other", "other", 999],
];

const locations = [
  ["Downtown", "downtown", 10],
  ["North Side", "north-side", 20],
  ["South Side", "south-side", 30],
  ["East Side", "east-side", 40],
  ["West Side", "west-side", 50],
  ["Suburbs", "suburbs", 60],
  ["Other", "other", 999],
];

const conditions = [
  ["New", "new", 10],
  ["Like New", "like-new", 20],
  ["Good", "good", 30],
  ["Fair", "fair", 40],
  ["For Parts", "for-parts", 50],
  ["Not Applicable", "not-applicable", 999],
];

const toRows = (arr) =>
  arr.map(([name, slug, sort_order]) => ({ name, slug, sort_order }));

async function upsert(table, rows, onConflict) {
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table.padEnd(12)} ${rows.length} rows ensured`);
}

console.log("Seeding", env.NEXT_PUBLIC_SUPABASE_URL);

// Platform reserve wallet (single row, fixed id).
{
  const { error } = await supabase
    .from("wallets")
    .upsert(
      { id: RESERVE_WALLET_ID, user_id: null, balance: 0, is_reserve: true },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw new Error(`wallets (reserve): ${error.message}`);
  console.log("  wallets      reserve wallet ensured");
}

await upsert("categories", toRows(categories), "slug");
await upsert("locations", toRows(locations), "slug");
await upsert("conditions", toRows(conditions), "slug");

console.log("Seed complete.");
