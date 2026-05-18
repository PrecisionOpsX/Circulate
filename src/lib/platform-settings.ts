import "server-only";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_RULES } from "@/lib/constants";

export type PlatformSettings = {
  /** Credits granted to each new account by the handle_new_user trigger. */
  signupCreditGrant: number;
};

const FALLBACK: PlatformSettings = {
  signupCreditGrant: CREDIT_RULES.STARTING_BALANCE,
};

/**
 * Read the singleton platform_settings row. Falls back to the in-code
 * default if the table is unreachable so pages can still render.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("signup_credit_grant")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return FALLBACK;
  return { signupCreditGrant: Number(data.signup_credit_grant) };
}
