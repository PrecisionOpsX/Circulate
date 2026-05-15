"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FavoriteResult = {
  ok: boolean;
  favorited?: boolean;
  error?: string;
};

/**
 * Toggle whether the signed-in user has favorited a listing.
 * Returns the resulting state so the client button can sync.
 */
export async function toggleFavoriteAction(
  listingId: string,
): Promise<FavoriteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save listings." };

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/favorites");
    return { ok: true, favorited: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/favorites");
  return { ok: true, favorited: true };
}
