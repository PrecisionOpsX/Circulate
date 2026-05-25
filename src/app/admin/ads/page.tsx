import type { Metadata } from "next";
import { getAllAds, AD_SLOTS } from "@/lib/ads";
import { toggleAdAction, deleteAdAction } from "./actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { CreateAdForm } from "@/components/ads/CreateAdForm";
import { AdCarousel } from "@/components/ads/AdCarousel";
import type { Ad } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Ads" };

const ERROR_MESSAGES: Record<string, string> = {
  invalid:       "Please fill in all required fields.",
  upload_failed: "Image upload failed. Try a URL instead.",
  failed:        "Something went wrong. Please try again.",
};

function adStatus(ad: Ad): { label: string; classes: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (!ad.is_enabled)
    return { label: "Paused",    classes: "bg-gray-100 text-gray-600" };
  if (ad.start_date && ad.start_date > today)
    return { label: "Scheduled", classes: "bg-blue-100 text-blue-700" };
  if (ad.end_date && ad.end_date < today)
    return { label: "Expired",   classes: "bg-red-100 text-red-600" };
  return   { label: "Live",      classes: "bg-green-100 text-green-700" };
}

export default async function AdminAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; deleted?: string; error?: string }>;
}) {
  const { created, deleted, error } = await searchParams;
  const ads = await getAllAds();

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-brand-900">
          Advertisements
        </h2>
        <p className="mt-1 text-sm text-muted">
          Manage sponsor banners. Each slot can hold one live ad at a time.
          Images can be hosted anywhere; use a Supabase storage URL for
          private hosting.
        </p>
      </header>

      {/* ---- Slot status overview ---- */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Slot overview
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {AD_SLOTS.map((slot) => {
            const today = new Date().toISOString().slice(0, 10);
            const live = ads.find(
              (a) =>
                a.slot === slot.value &&
                a.is_enabled &&
                (a.start_date === null || a.start_date <= today) &&
                (a.end_date   === null || a.end_date   >= today),
            );
            return (
              <div
                key={slot.value}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-brand-900">
                    {slot.label}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      live
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {live ? "Live" : "Empty"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {slot.value}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Feedback alerts ---- */}
      {created && <Alert variant="success">Ad created successfully.</Alert>}
      {deleted && <Alert variant="success">Ad deleted.</Alert>}
      {error && (
        <Alert variant="error">
          {ERROR_MESSAGES[error] ?? "Something went wrong."}
        </Alert>
      )}

      {/* ---- Create new ad ---- */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-brand-900">
          Add a new ad
        </h3>

        <CreateAdForm />
      </section>

      {/* ---- All ads list ---- */}
      {ads.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-brand-900">
            All ads ({ads.length})
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {ads.map((ad) => {
              const { label, classes } = adStatus(ad);
              const slotLabel =
                AD_SLOTS.find((s) => s.value === ad.slot)?.label ?? ad.slot;

              return (
                <li
                  key={ad.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-4"
                >
                  {/* Image preview (carousel if multiple) */}
                  <div className="relative h-14 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-brand-50">
                    <AdCarousel
                      images={
                        ad.image_urls && ad.image_urls.length > 0
                          ? ad.image_urls
                          : [ad.image_url]
                      }
                      href={ad.link_url}
                      sizes="112px"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-brand-900">
                        {slotLabel}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${classes}`}
                      >
                        {label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {ad.link_url}
                    </p>
                    {(ad.start_date || ad.end_date) && (
                      <p className="mt-0.5 text-xs text-muted">
                        {ad.start_date ?? "now"} &rarr;{" "}
                        {ad.end_date ?? "no end"}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    {/* Toggle enable/disable */}
                    <form action={toggleAdAction}>
                      <input type="hidden" name="adId" value={ad.id} />
                      <input
                        type="hidden"
                        name="isEnabled"
                        value={String(ad.is_enabled)}
                      />
                      <SubmitButton
                        size="sm"
                        variant={ad.is_enabled ? "secondary" : "ghost"}
                        pendingLabel="..."
                      >
                        {ad.is_enabled ? "Pause" : "Enable"}
                      </SubmitButton>
                    </form>

                    {/* Delete */}
                    <form action={deleteAdAction}>
                      <input type="hidden" name="adId" value={ad.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-red-50 hover:text-danger"
                      >
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {ads.length === 0 && !created && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          No ads yet. Create one above to start displaying banners.
        </p>
      )}
    </div>
  );
}
