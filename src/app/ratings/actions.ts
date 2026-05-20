"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ratingSchema } from "@/lib/validation";

export type RatingFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Insert a rating for a completed transaction. The DB unique constraint
 * (transaction_id, rater_id) blocks double-rating. The denormalisation
 * trigger immediately refreshes the ratee's rating_avg + rating_count.
 */
export async function submitRatingAction(
  _prev: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to leave a rating." };

  const transactionId = String(formData.get("transactionId") ?? "");
  if (!transactionId) return { ok: false, error: "Missing transaction." };

  const parsed = ratingSchema.safeParse({
    stars: formData.get("stars"),
    review: formData.get("review") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { data: txn } = await supabase
    .from("transactions")
    .select("id, status, buyer_id, seller_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (!txn) return { ok: false, error: "Transaction not found." };
  if (txn.status !== "completed") {
    return { ok: false, error: "You can only rate completed trades." };
  }

  let rateeId: string;
  if (txn.buyer_id === user.id) rateeId = txn.seller_id;
  else if (txn.seller_id === user.id) rateeId = txn.buyer_id;
  else return { ok: false, error: "You weren't part of this trade." };

  const { error } = await supabase.from("ratings").insert({
    transaction_id: transactionId,
    rater_id: user.id,
    ratee_id: rateeId,
    stars: parsed.data.stars,
    review: parsed.data.review || null,
  });
  if (error) {
    // Unique-violation = already rated; surface a clear message.
    if (error.code === "23505") {
      return { ok: false, error: "You've already rated this trade." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/users/${rateeId}`);
  revalidatePath("/dashboard");
  redirect(`/users/${rateeId}?rated=1`);
}
