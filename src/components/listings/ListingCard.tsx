import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { ListingStatusBadge } from "@/components/listings/ListingStatusBadge";
import { coverPhoto, listingTypeLabel } from "@/lib/listings";
import type { ListingWithRelations } from "@/lib/listings";
import { formatCredits } from "@/lib/utils";

type Props = {
  listing: ListingWithRelations;
  isAuthenticated: boolean;
  isFavorited: boolean;
  /** Show the status badge + skip the favorite heart (owner's "My listings"). */
  ownerView?: boolean;
};

/** Marketplace grid card. The whole card is a link via a stretched overlay. */
export function ListingCard({
  listing,
  isAuthenticated,
  isFavorited,
  ownerView = false,
}: Props) {
  const cover = coverPhoto(listing);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 300px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-200">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}

        <span className="absolute left-3 top-3 z-10">
          <Badge variant={listing.type === "service" ? "blue" : "brand"}>
            {listingTypeLabel(listing.type)}
          </Badge>
        </span>

        {ownerView ? (
          <span className="absolute right-3 top-3 z-10">
            <ListingStatusBadge status={listing.status} />
          </span>
        ) : (
          <FavoriteButton
            listingId={listing.id}
            initialFavorited={isFavorited}
            isAuthenticated={isAuthenticated}
            className="absolute right-3 top-3 z-10"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-muted">
          {listing.category?.name ?? "Uncategorised"}
        </p>
        <h3 className="mt-0.5 line-clamp-1 font-semibold text-brand-900">
          {listing.title}
        </h3>
        {listing.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {listing.location.name}
          </p>
        )}
        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-lg font-bold text-circ-green">
            {formatCredits(listing.price)}
            <span className="ml-1 text-xs font-medium text-muted">credits</span>
          </span>
        </div>
      </div>

      <Link
        href={`/listings/${listing.id}`}
        className="absolute inset-0"
        aria-label={listing.title}
      />
    </div>
  );
}
