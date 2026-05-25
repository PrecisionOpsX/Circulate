import { getActiveAd } from "@/lib/ads";
import { AdCarousel } from "@/components/ads/AdCarousel";

type Props = {
  slot: string;
  /** Extra Tailwind classes applied to the wrapper (e.g. margin utilities). */
  className?: string;
};

/**
 * Async server component that renders a sponsored banner for a given slot.
 * Returns null silently when no live ad is configured, leaving no whitespace.
 * Supports multi-image carousels when the ad has more than one image.
 */
export async function AdBanner({ slot, className = "" }: Props) {
  const ad = await getActiveAd(slot);
  if (!ad) return null;

  // Prefer the image_urls array; fall back to the single image_url.
  const images =
    ad.image_urls && ad.image_urls.length > 0
      ? ad.image_urls
      : [ad.image_url];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${className}`}
    >
      <AdCarousel
        images={images}
        href={ad.link_url}
        sizes="(max-width: 896px) 100vw, 896px"
      />
      <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/80">
        Sponsored
      </span>
    </div>
  );
}
