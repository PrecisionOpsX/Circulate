import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT, type ListingWithRelations } from "@/lib/listings";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch one listing with its photos, taxonomies and seller.
 * Returns null for a bad id or a listing the caller can't see (RLS).
 */
export async function getListingDetail(
  id: string,
): Promise<ListingWithRelations | null> {
  if (!UUID_RE.test(id)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle()
    .returns<ListingWithRelations>();

  return data ?? null;
}

/**
 * Whether the signed-in user has favorited a given listing.
 * False when signed out.
 */
export async function isFavorited(
  listingId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .maybeSingle();
  return Boolean(data);
}
