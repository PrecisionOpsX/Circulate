import type { Listing, ListingType } from "@/lib/supabase/types";

/**
 * View-model types for listings joined with their photos, taxonomies and
 * seller. The hand-written Database type doesn't model embedded selects,
 * so queries use `.returns<...>()` with these shapes.
 */

export type TaxonomyLite = { name: string; slug: string };

export type SellerLite = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  completed_trades: number;
  email_verified: boolean;
  phone_verified: boolean;
  rating_avg: number;
  rating_count: number;
};

export type ListingPhotoLite = {
  url: string;
  storage_path: string | null;
  sort_order: number;
};

/** A listing plus everything needed to render a card or detail page. */
export type ListingWithRelations = Listing & {
  listing_photos: ListingPhotoLite[];
  category: TaxonomyLite | null;
  location: TaxonomyLite | null;
  condition: TaxonomyLite | null;
  seller: SellerLite | null;
};

/** Columns + embedded relations selected for listing cards and detail pages. */
export const LISTING_SELECT =
  "*, listing_photos(url, storage_path, sort_order), " +
  "category:categories(name, slug), " +
  "location:locations(name, slug), " +
  "condition:conditions(name, slug), " +
  "seller:profiles(id, display_name, avatar_url, completed_trades, email_verified, phone_verified, rating_avg, rating_count)";

/** Photos sorted by their display order. */
export function sortedPhotos(listing: {
  listing_photos: ListingPhotoLite[];
}): ListingPhotoLite[] {
  return [...listing.listing_photos].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
}

/** First photo URL for a listing, or null when it has none. */
export function coverPhoto(listing: {
  listing_photos: ListingPhotoLite[];
}): string | null {
  return sortedPhotos(listing)[0]?.url ?? null;
}

/** Human label for a listing type. */
export function listingTypeLabel(type: ListingType): string {
  return type === "service" ? "Service" : "Goods";
}
