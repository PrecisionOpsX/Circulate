"use client";

import Link from "next/link";
import {
  deleteListingAction,
  updateListingStatusAction,
} from "@/app/listings/actions";
import { Button } from "@/components/ui/Button";
import type { ListingStatus } from "@/lib/supabase/types";

/** Edit / status / delete controls shown to a listing's owner. */
export function OwnerControls({
  listingId,
  status,
}: {
  listingId: string;
  status: ListingStatus;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-brand-50 p-4">
      <p className="text-sm font-semibold text-brand-900">
        This is your listing
      </p>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/listings/${listingId}/edit`}>Edit listing</Link>
        </Button>

        {status === "active" && (
          <form action={updateListingStatusAction}>
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="status" value="sold" />
            <Button type="submit" size="sm" variant="secondary">
              Mark as sold
            </Button>
          </form>
        )}

        {status === "sold" && (
          <form action={updateListingStatusAction}>
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="status" value="active" />
            <Button type="submit" size="sm" variant="secondary">
              Mark as available
            </Button>
          </form>
        )}

        <form
          action={deleteListingAction}
          onSubmit={(e) => {
            if (
              !window.confirm(
                "Delete this listing? This permanently removes it and its photos.",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="listingId" value={listingId} />
          <Button type="submit" size="sm" variant="danger">
            Delete
          </Button>
        </form>
      </div>
    </div>
  );
}
