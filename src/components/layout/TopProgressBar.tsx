"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Persistent top-of-page progress bar.
 *
 * Lights up the moment the user clicks any internal link, then hides once
 * the URL settles on the new pathname or search-params. Sits in the root
 * layout so every page is covered without adding code per route.
 *
 * Intentional scope:
 * - Catches `<a>` clicks (which includes next/link in App Router).
 * - Catches browser back/forward via pathname change.
 * - Does NOT catch programmatic `router.push` from inside actions, since
 *   those flows already render their own pending state (e.g. submit
 *   buttons going to "Applying..."). The bar is best-effort feedback for
 *   the navigation cases that aren't already self-announcing.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  // Whenever the URL settles on a new value, hide the bar. Done with the
  // "adjust state during render" pattern so we avoid setState-in-effect.
  const navKey = `${pathname}?${searchParams.toString()}`;
  const [lastKey, setLastKey] = useState(navKey);
  if (lastKey !== navKey) {
    setLastKey(navKey);
    setActive(false);
  }

  // Show the bar on internal anchor clicks.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target === "_blank") return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Same URL means no navigation, skip.
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
        setActive(true);
      } catch {
        // malformed href, ignore
      }
    }

    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Safety net: if the URL never changes (e.g. a link redirects back to the
  // same page server-side) we'd be stuck spinning forever. Auto-hide after
  // 10s of activity.
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setActive(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,var(--color-circ-green),var(--color-circ-blue))]" />
    </div>
  );
}
