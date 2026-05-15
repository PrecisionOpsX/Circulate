"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ListingPhotoLite } from "@/lib/listings";

/** Detail-page photo viewer: large cover image + thumbnail strip. */
export function PhotoGallery({
  photos,
  title,
}: {
  photos: ListingPhotoLite[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-border bg-brand-50 text-brand-200">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  const main = photos[active] ?? photos[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-brand-50">
        <Image
          src={main.url}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 600px"
          className="object-cover"
          priority
        />
      </div>

      {photos.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((photo, i) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border-2 transition-colors",
                i === active
                  ? "border-circ-blue"
                  : "border-transparent hover:border-brand-200",
              )}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
