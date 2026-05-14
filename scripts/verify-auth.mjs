/**
 * End-to-end check of the auth bootstrap: creates a throwaway user via the
 * Admin API, confirms the handle_new_user() trigger created a profile + a
 * 0-credit wallet, then deletes the user.
 *
 *   node scripts/verify-auth.mjs
 *
 * Run this after applying supabase/setup.sql.
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

const email = `circulate-test-${Date.now()}@example.com`;
let userId;
let failed = false;

function check(label, ok, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failed = true;
}

try {
  // 1. Reference data present?
  const { data: cats } = await supabase.from("categories").select("id");
  check("seed: categories present", (cats?.length ?? 0) > 0, `${cats?.length ?? 0} rows`);

  const { data: reserve } = await supabase
    .from("wallets")
    .select("id")
    .eq("is_reserve", true);
  check("seed: reserve wallet present", (reserve?.length ?? 0) === 1);

  // 2. Create a user — the trigger should bootstrap profile + wallet.
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password: "test-password-1234",
      email_confirm: true,
      user_metadata: { display_name: "Test User", accepted_terms: "true" },
    });
  if (createErr) {
    check("admin.createUser", false, createErr.message);
    throw new Error("cannot continue");
  }
  userId = created.user.id;
  check("admin.createUser", true, userId);

  // Give the trigger a beat to commit.
  await new Promise((r) => setTimeout(r, 800));

  // 3. Profile row auto-created?
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, accepted_terms_at, email_verified")
    .eq("id", userId)
    .maybeSingle();
  check("trigger: profile row created", Boolean(profile));
  check(
    "trigger: display_name from metadata",
    profile?.display_name === "Test User",
    profile?.display_name,
  );
  check(
    "trigger: accepted_terms_at stamped",
    Boolean(profile?.accepted_terms_at),
  );

  // 4. Wallet row auto-created with 0 balance?
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, is_reserve")
    .eq("user_id", userId)
    .maybeSingle();
  check("trigger: wallet row created", Boolean(wallet));
  check("trigger: wallet starts at 0", Number(wallet?.balance) === 0);
} catch (err) {
  console.error("error:", err.message);
  failed = true;
} finally {
  // 5. Clean up.
  if (userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    check("cleanup: test user deleted", !error, error?.message ?? "");
  }
}

console.log(failed ? "\nRESULT: FAILED" : "\nRESULT: all checks passed");
process.exit(failed ? 1 : 0);
