import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTaxonomies } from "@/lib/taxonomies";
import { ListingForm } from "@/components/listings/ListingForm";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const user = await requireUser("/listings/new");
  const { categories, locations, conditions } = await getTaxonomies();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/listings/mine" className="hover:text-foreground">
          My listings
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">New listing</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight text-brand-900">
        Create a listing
      </h1>
      <p className="mt-1 text-sm text-muted">
        List something to trade. Buyers pay in community credits.
      </p>

      <div className="mt-8">
        <ListingForm
          mode="create"
          userId={user.id}
          categories={categories}
          locations={locations}
          conditions={conditions}
        />
      </div>
    </div>
  );
}
