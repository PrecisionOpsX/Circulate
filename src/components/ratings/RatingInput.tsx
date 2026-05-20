"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Interactive 1-5 star picker. Renders a hidden input with the chosen
 * value under the field name `stars` so it ships with the enclosing form.
 */
export function RatingInput({
  defaultValue = 0,
  size = 32,
}: {
  defaultValue?: number;
  size?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div>
      <input type="hidden" name="stars" value={value} />
      <div
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
            aria-pressed={value === n}
            className="rounded transition-transform hover:scale-110 focus-visible:outline-none"
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={n <= display ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "transition-colors",
                n <= display ? "text-gold-400" : "text-slate-300",
              )}
              aria-hidden
            >
              <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
            </svg>
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-muted">
          {value === 0 ? "Pick a rating" : `${value} of 5`}
        </span>
      </div>
    </div>
  );
}
