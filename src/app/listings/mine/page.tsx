import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT, type ListingWithRelations } from "@/lib/listings";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/listings/ListingCard";

export const metadata: Metadata = { title: "My listings" };

export default async function MyListingsPage() {
  const user = await requireUser("/listings/mine");
  const supabase = await createClient();

  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ListingWithRelations[]>();

  const listings = data ?? [];
  const activeCount = listings.filter((l) => l.status === "active").length;
  const soldCount = listings.filter((l) => l.status === "sold").length;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">
            My listings
          </h1>
          <p className="mt-1 text-sm text-muted">
            {listings.length} total · {activeCount} active · {soldCount} sold
          </p>
        </div>
        <Button asChild>
          <Link href="/listings/new">+ New listing</Link>
        </Button>
      </div>

      <div className="mt-8">
        {listings.length === 0 ? (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            title="You haven't listed anything yet"
            description="Post goods or a service to start earning community credits."
            action={
              <Button asChild>
                <Link href="/listings/new">Create your first listing</Link>
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
                isFavorited={false}
                ownerView
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
