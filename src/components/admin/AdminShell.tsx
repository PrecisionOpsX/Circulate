"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { adminIcons } from "@/components/admin/admin-icons";
import { setAdminViewAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  displayName: string;
};

/**
 * Client-side admin layout shell.
 * Holds the sidebar expand/collapse state and renders the full chrome
 * (sidebar + top bar + content + footer) around the server-rendered page.
 *
 * Children are RSC subtrees passed from the server layout — this pattern
 * is valid in Next.js App Router.
 */
export function AdminShell({ children, displayName }: Props) {
  const [expanded, setExpanded] = useState(true);

  // Restore preference after hydration (avoids SSR mismatch).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("adminSidebarExpanded");
      if (saved !== null) setExpanded(saved !== "false");
    } catch {
      // localStorage unavailable (e.g. private browsing blocked).
    }
  }, []);

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("adminSidebarExpanded", String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  const closeMobileSidebar = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
    ) {
      setExpanded(false);
      try {
        localStorage.setItem("adminSidebarExpanded", "false");
      } catch {
        /* noop */
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-brand-900 px-4 text-white sm:px-6">
        <Link
          href="/admin"
          className="flex min-w-0 items-center gap-2.5 overflow-hidden"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
            {adminIcons.shield}
          </span>
          <span className="hidden truncate font-bold tracking-tight md:block">
            Circulate Admin
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden text-sm text-white/60 sm:inline">
            {displayName}
          </span>
          <form action={setAdminViewAction}>
            <input type="hidden" name="view" value="customer" />
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Exit to customer view
            </button>
          </form>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {expanded && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 top-14 z-40 bg-black/50 md:hidden"
            onClick={toggle}
          />
        )}

        <div
          className={cn(
            "max-md:contents",
            expanded ? "md:w-60" : "md:w-16",
          )}
        >
          <AdminSidebar expanded={expanded} onNavigate={closeMobileSidebar} />
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "fixed top-[4.25rem] z-[60] flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-brand-900 text-white/70 shadow-md transition-[left] duration-200 cursor-pointer hover:text-white",
            expanded
              ? "left-[15.25rem] md:left-[calc(15rem+0.75rem)]"
              : "left-3 md:left-[calc(4rem+0.75rem)]",
          )}
        >
          {expanded ? adminIcons.chevronLeft : adminIcons.chevronRight}
        </button>

        <div className="relative flex min-w-0 w-full flex-1 flex-col">
          <main className="flex-1 px-6 py-8 pt-14">
            <div className="mx-auto w-full max-w-4xl">{children}</div>
          </main>

          <footer className="border-t border-border bg-surface">
            <div className="px-6 py-4 text-xs text-muted">
              Circulate admin panel. Changes here affect the live marketplace.
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
