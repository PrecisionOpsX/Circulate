"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

type Props = {
  images: string[];
  href: string;
  sizes?: string;
};

/**
 * Auto-playing banner carousel for ads that have multiple images.
 * For single-image ads it renders a plain static banner.
 * Dots are navigation controls; clicking them prevents link navigation.
 */
export function AdCarousel({ images, href, sizes = "(max-width: 896px) 100vw, 896px" }: Props) {
  const [current, setCurrent] = useState(0);

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(advance, 4000);
    return () => clearInterval(id);
  }, [images.length, advance]);

  if (images.length === 0) return null;

  return (
    <div className="relative h-20 w-full sm:h-24">
      {/* Images */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label="Sponsored advertisement"
        className="block h-full w-full"
      >
        {images.map((src, i) => (
          <div
            key={src + i}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={src}
              alt="Sponsored"
              fill
              sizes={sizes}
              className="object-cover transition-opacity hover:opacity-90"
              unoptimized
            />
          </div>
        ))}
      </a>

      {/* Dot navigation (only shown when there are multiple images) */}
      {images.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrent(i);
              }}
              className={`pointer-events-auto h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-4 bg-white shadow"
                  : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
