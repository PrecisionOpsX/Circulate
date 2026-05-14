import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Browse" };

export default function BrowsePage() {
  return (
    <PageShell
      title="Browse the marketplace"
      intro="The full marketplace (listings, search and filters) lands in Milestone 2."
    >
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
        Listings will appear here soon.
      </div>
    </PageShell>
  );
}
