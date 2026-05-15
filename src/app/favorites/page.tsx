import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT, type ListingWithRelations } from "@/lib/listings";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/listings/ListingCard";

export const metadata: Metadata = { title: "Saved listings" };

export default async function FavoritesPage() {
  const user = await requireUser("/favorites");
  const supabase = await createClient();

  const { data: favs } = await supabase
    .from("favorites")
    .select("listing_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (favs ?? []).map((f) => f.listing_id);

  let listings: ListingWithRelations[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .in("id", ids)
      .returns<ListingWithRelations[]>();
    // Preserve "most recently saved first" ordering.
    const rank = new Map(ids.map((id, i) => [id, i]));
    listings = (data ?? []).sort(
      (a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0),
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">
          Saved listings
        </h1>
        <p className="mt-1 text-sm text-muted">
          {listings.length} saved {listings.length === 1 ? "listing" : "listings"}
        </p>
      </header>

      {listings.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          }
          title="No saved listings yet"
          description="Tap the heart on any listing to save it here for later."
          action={
            <Button asChild>
              <Link href="/browse">Browse the marketplace</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isAuthenticated
              isFavorited
            />
          ))}
        </div>
      )}
    </div>
  );
}
