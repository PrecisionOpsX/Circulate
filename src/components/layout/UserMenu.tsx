"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

/** Avatar button + dropdown with profile links and sign-out. */
export function UserMenu({ displayName, avatarUrl, isAdmin }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          <div className="border-b border-border px-4 py-2.5">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted">Signed in</p>
          </div>
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/listings/mine", label: "My listings" },
            { href: "/favorites", label: "Saved listings" },
            { href: "/transactions", label: "Transactions" },
            { href: "/credits/buy", label: "Buy credits" },
            { href: "/profile", label: "Profile" },
            { href: "/settings", label: "Settings" },
            ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className={cn(
              "block w-full border-t border-border px-4 py-2 text-left text-sm text-danger",
              "hover:bg-danger-bg",
            )}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
