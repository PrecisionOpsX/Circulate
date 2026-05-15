import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  currentPage: number;
  totalPages: number;
  /** Build the URL for a given page number. The parent owns query params. */
  hrefForPage: (page: number) => string;
};

/**
 * Numbered pagination with ellipsis for long ranges. Renders prev / next
 * always, and the numbered list on tablets and larger; phones get just
 * "Page X of Y" between the prev/next controls.
 */
export function Pagination({ currentPage, totalPages, hrefForPage }: Props) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between gap-3 sm:justify-center"
    >
      <PageControl
        href={hasPrev ? hrefForPage(currentPage - 1) : null}
        label="Previous"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </PageControl>

      <ol className="hidden items-center gap-1 sm:flex">
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <li key={`e${i}`} aria-hidden className="px-2 text-muted">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={hrefForPage(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={cn(
                  "flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors",
                  p === currentPage
                    ? "bg-brand-600 text-white"
                    : "border border-border bg-surface text-brand-800 hover:border-brand-300",
                )}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ol>

      <span className="text-sm text-muted sm:hidden">
        Page {currentPage} of {totalPages}
      </span>

      <PageControl
        href={hasNext ? hrefForPage(currentPage + 1) : null}
        label="Next"
      >
        <span className="hidden sm:inline">Next</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </PageControl>
    </nav>
  );
}

function PageControl({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium transition-colors";
  if (!href) {
    return (
      <span aria-disabled className={cn(className, "text-muted/50")}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(className, "text-brand-800 hover:border-brand-300")}
    >
      {children}
    </Link>
  );
}

/**
 * Build the compact page list: always includes 1 and totalPages, plus the
 * current page and its neighbours, with "ellipsis" sentinels in any gaps.
 *
 *   5 of  5  -> 1 2 3 4 5
 *   1 of 10  -> 1 2 3 … 10
 *   5 of 10  -> 1 … 4 5 6 … 10
 *  10 of 10  -> 1 … 8 9 10
 */
function buildPageList(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("ellipsis");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}
