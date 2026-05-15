import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTaxonomies } from "@/lib/taxonomies";
import { LISTING_SELECT, type ListingWithRelations } from "@/lib/listings";
import { BROWSE_PAGE_SIZE } from "@/lib/constants";
import {
  BrowseFilters,
  type BrowseValues,
} from "@/components/listings/BrowseFilters";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Browse the marketplace" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (key: string) =>
    typeof sp[key] === "string" ? (sp[key] as string).trim() : "";

  const values: BrowseValues = {
    q: str("q"),
    category: str("category"),
    location: str("location"),
    type: str("type"),
    condition: str("condition"),
    minPrice: str("minPrice"),
    maxPrice: str("maxPrice"),
    sort: str("sort") || "newest",
  };
  const page = Math.max(1, parseInt(str("page") || "1", 10) || 1);

  const [{ categories, locations, conditions }, user] = await Promise.all([
    getTaxonomies(),
    getSessionUser(),
  ]);

  const supabase = await createClient();

  const categoryId = categories.find((c) => c.slug === values.category)?.id;
  const locationId = locations.find((l) => l.slug === values.location)?.id;
  const conditionId = conditions.find((c) => c.slug === values.condition)?.id;

  // Filters (each method keeps a PostgrestFilterBuilder, so reassigning is safe).
  let filtered = supabase
    .from("listings")
    .select(LISTING_SELECT, { count: "exact" })
    .eq("status", "active");

  if (values.q) {
    filtered = filtered.textSearch("search_vector", values.q, {
      type: "websearch",
      config: "english",
    });
  }
  if (categoryId) filtered = filtered.eq("category_id", categoryId);
  if (locationId) filtered = filtered.eq("location_id", locationId);
  if (conditionId) filtered = filtered.eq("condition_id", conditionId);
  if (values.type === "goods" || values.type === "service") {
    filtered = filtered.eq("type", values.type);
  }
  const min = Number.parseFloat(values.minPrice);
  const max = Number.parseFloat(values.maxPrice);
  if (!Number.isNaN(min)) filtered = filtered.gte("price", min);
  if (!Number.isNaN(max)) filtered = filtered.lte("price", max);

  // Sort, then paginate.
  const sorted =
    values.sort === "price-asc"
      ? filtered.order("price", { ascending: true })
      : values.sort === "price-desc"
        ? filtered.order("price", { ascending: false })
        : filtered.order("created_at", { ascending: false });

  const from = (page - 1) * BROWSE_PAGE_SIZE;
  const { data, count } = await sorted
    .range(from, from + BROWSE_PAGE_SIZE - 1)
    .returns<ListingWithRelations[]>();

  const listings = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value && !(key === "sort" && value === "newest")) {
        params.set(key, value);
      }
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/browse?${qs}` : "/browse";
  };

  // Guard against ?page= values past the end (stale links, manual edits) so
  // users don't land on an empty grid that looks like "no results".
  if (total > 0 && page > totalPages) {
    redirect(pageHref(totalPages));
  }

  // Favorites for the signed-in user, to light up the heart on each card.
  let favoritedIds = new Set<string>();
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", user.id);
    favoritedIds = new Set((favs ?? []).map((f) => f.listing_id));
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">
          Browse the marketplace
        </h1>
        <p className="mt-1 text-sm text-muted">
          Discover goods and services from the community, all priced in credits.
        </p>
      </header>

      <BrowseFilters
        values={values}
        categories={categories}
        locations={locations}
        conditions={conditions}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {total === 0 ? (
            <>No listings</>
          ) : totalPages > 1 ? (
            <>
              Showing{" "}
              <span className="font-medium text-foreground">
                {from + 1} to {Math.min(from + BROWSE_PAGE_SIZE, total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{total}</span>{" "}
              listings
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{total}</span>{" "}
              {total === 1 ? "listing" : "listings"}
            </>
          )}
          {values.q && (
            <>
              {" "}
              for{" "}
              <span className="font-medium text-foreground">{values.q}</span>
            </>
          )}
        </p>
      </div>

      <div className="mt-4">
        {listings.length === 0 ? (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            }
            title="No listings match your search"
            description="Try clearing some filters or searching for something else."
            action={
              <Link
                href="/browse"
                className="text-sm font-semibold text-circ-blue hover:text-circ-blue-dark"
              >
                Clear all filters
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isAuthenticated={Boolean(user)}
                isFavorited={favoritedIds.has(listing.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        hrefForPage={pageHref}
      />
    </div>
  );
}
