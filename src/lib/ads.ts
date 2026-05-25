import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Ad } from "@/lib/supabase/types";

export { AD_SLOTS, type AdSlotValue } from "@/lib/ad-slots";

/**
 * Fetch the first currently-live ad for a given slot.
 * Applies an explicit date+enabled filter so admins browsing the app
 * see only live ads (not drafts) in the banner positions.
 */
export async function getActiveAd(slot: string): Promise<Ad | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .eq("slot", slot)
    .eq("is_enabled", true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getActiveAd]", error.message);
    return null;
  }

  return data;
}

/** Fetch all ads for the admin panel (bypasses date filter via admin RLS). */
export async function getAllAds(): Promise<Ad[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ads")
    .select("*")
    .order("slot")
    .order("created_at", { ascending: false })
    .returns<Ad[]>();
  return data ?? [];
}
