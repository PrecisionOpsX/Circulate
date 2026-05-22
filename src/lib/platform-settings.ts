import "server-only";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_RULES } from "@/lib/constants";

export type PlatformSettings = {
  /** Credits granted to each new account by the handle_new_user trigger. */
  signupCreditGrant: number;
  /** Maximum credits a single user can purchase in any rolling 30 days. */
  monthlyCreditPurchaseCap: number;
  /** Platform fee taken from each completed sale, as a 0-1 rate. */
  transactionFeeRate: number;
};

const FALLBACK: PlatformSettings = {
  signupCreditGrant: CREDIT_RULES.STARTING_BALANCE,
  monthlyCreditPurchaseCap: 500,
  transactionFeeRate: CREDIT_RULES.FEE_RATE,
};

/**
 * Read the singleton platform_settings row. Falls back to the in-code
 * defaults if the table is unreachable so pages can still render.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("signup_credit_grant, monthly_credit_purchase_cap, transaction_fee_rate")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return FALLBACK;
  return {
    signupCreditGrant: Number(data.signup_credit_grant),
    monthlyCreditPurchaseCap:
      data.monthly_credit_purchase_cap != null
        ? Number(data.monthly_credit_purchase_cap)
        : FALLBACK.monthlyCreditPurchaseCap,
    transactionFeeRate:
      data.transaction_fee_rate != null
        ? Number(data.transaction_fee_rate)
        : FALLBACK.transactionFeeRate,
  };
}

/**
 * Sum of completed credit purchases the user has made in the last 30
 * days. Used to enforce monthlyCreditPurchaseCap before starting a
 * Stripe checkout session.
 */
export async function getRecentCreditPurchaseTotal(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("credit_purchases")
    .select("credits")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("completed_at", cutoff);
  return (data ?? []).reduce((sum, row) => sum + Number(row.credits), 0);
}
