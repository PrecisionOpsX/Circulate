"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PayState = {
  ok: boolean;
  error?: string;
};

/**
 * Pay for a listing using community credits.
 *
 * Delegates the actual wallet movement to the transfer_credits() SQL
 * function, which validates auth, listing availability, balance floor,
 * and performs the atomic debit / credit / fee / status update under a
 * row lock. Server-friendly error messages are raised by the function.
 */
export async function payListingAction(
  _prev: PayState,
  formData: FormData,
): Promise<PayState> {
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return { ok: false, error: "Missing listing reference." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to pay." };

  const { data: txn, error } = await supabase.rpc("transfer_credits", {
    p_listing_id: listingId,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings/mine");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  // After a successful trade, send the buyer to the rate-this-trade
  // page. The page itself offers a "Skip for now" link back to the
  // listing if they don't want to rate right away.
  const txnId = (txn as { id?: string } | null)?.id;
  if (txnId) {
    redirect(`/transactions/${txnId}/rate?listing=${listingId}`);
  }
  redirect(`/listings/${listingId}?paid=1`);
}
