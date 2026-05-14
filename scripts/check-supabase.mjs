// One-off connectivity + schema check. Safe to delete.
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

console.log("Project:", env.NEXT_PUBLIC_SUPABASE_URL, "\n");

// Seed data present?
const { data: cats } = await supabase.from("categories").select("name");
const { data: locs } = await supabase.from("locations").select("name");
const { data: conds } = await supabase.from("conditions").select("name");
const { data: reserve } = await supabase
  .from("wallets")
  .select("id,is_reserve,balance")
  .eq("is_reserve", true);

console.log("categories rows:", cats?.length ?? 0);
console.log("locations rows: ", locs?.length ?? 0);
console.log("conditions rows:", conds?.length ?? 0);
console.log("reserve wallet: ", reserve?.length ? "present" : "MISSING");

// profiles table reachable?
const { error: pErr } = await supabase
  .from("profiles")
  .select("id", { count: "exact", head: true });
console.log("profiles query: ", pErr ? pErr.message : "ok");
