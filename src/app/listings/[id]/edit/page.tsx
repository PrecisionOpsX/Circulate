import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getListingDetail } from "@/lib/listing-queries";
import { getTaxonomies } from "@/lib/taxonomies";
import { sortedPhotos } from "@/lib/listings";
import { ListingForm } from "@/components/listings/ListingForm";

export const metadata: Metadata = { title: "Edit listing" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/edit`);
  const listing = await getListingDetail(id);

  if (!listing) notFound();
  if (listing.seller_id !== user.id) redirect(`/listings/${id}`);

  const { categories, locations, conditions } = await getTaxonomies();

  const initialPhotos = sortedPhotos(listing)
    .filter((p) => p.storage_path)
    .map((p) => ({ url: p.url, path: p.storage_path as string }));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <nav className="mb-6 text-sm text-muted">
        <Link href={`/listings/${id}`} className="hover:text-foreground">
          {listing.title}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Edit</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight text-brand-900">
        Edit listing
      </h1>
      <p className="mt-1 text-sm text-muted">
        Update the details below. Changes go live immediately.
      </p>

      <div className="mt-8">
        <ListingForm
          mode="edit"
          userId={user.id}
          listing={listing}
          initialPhotos={initialPhotos}
          categories={categories}
          locations={locations}
          conditions={conditions}
        />
      </div>
    </div>
  );
}
