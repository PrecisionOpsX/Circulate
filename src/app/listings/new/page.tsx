import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "New listing" };

/** Protected placeholder. The listing creation form arrives in Milestone 2. */
export default async function NewListingPage() {
  await requireUser("/listings/new");

  return (
    <PageShell
      title="Create a listing"
      intro="The listing creation form (photos, category, condition and pricing) arrives in Milestone 2."
    >
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
        You&apos;re signed in and ready. Listing tools are coming soon.
      </div>
    </PageShell>
  );
}
