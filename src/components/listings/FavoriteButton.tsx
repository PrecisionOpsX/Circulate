"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleFavoriteAction } from "@/app/favorites/actions";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  /** "icon" floats on a card; "button" is a labelled control on the detail page. */
  variant?: "icon" | "button";
  className?: string;
};

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

/** Heart toggle for saving a listing. Falls back to a login prompt when signed out. */
export function FavoriteButton({
  listingId,
  initialFavorited,
  isAuthenticated,
  variant = "icon",
  className,
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  const iconBase =
    "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/95 shadow-sm backdrop-blur transition-colors";
  const buttonBase =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors";

  if (!isAuthenticated) {
    return (
      <Link
        href="/login?next=/browse"
        aria-label="Sign in to save this listing"
        className={cn(
          variant === "icon"
            ? `${iconBase} text-muted hover:text-circ-blue`
            : `${buttonBase} border-border bg-surface text-brand-800 hover:border-brand-300`,
          className,
        )}
      >
        <Heart filled={false} />
        {variant === "button" && "Save"}
      </Link>
    );
  }

  const toggle = () => {
    const next = !favorited;
    setFavorited(next); // optimistic
    startTransition(async () => {
      const result = await toggleFavoriteAction(listingId);
      if (!result.ok) setFavorited(!next); // revert on failure
      else if (typeof result.favorited === "boolean") {
        setFavorited(result.favorited);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from saved" : "Save listing"}
      className={cn(
        variant === "icon"
          ? cn(
              iconBase,
              favorited
                ? "text-danger"
                : "text-muted hover:text-danger",
            )
          : cn(
              buttonBase,
              favorited
                ? "border-danger/30 bg-danger-bg text-danger"
                : "border-border bg-surface text-brand-800 hover:border-brand-300",
            ),
        "disabled:opacity-60",
        className,
      )}
    >
      <Heart filled={favorited} />
      {variant === "button" && (favorited ? "Saved" : "Save")}
    </button>
  );
}
