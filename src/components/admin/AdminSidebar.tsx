"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AdminNavIcon } from "@/components/admin/admin-icons";

const icons = {
  overview: (
    <AdminNavIcon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </AdminNavIcon>
  ),
  users: (
    <AdminNavIcon>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </AdminNavIcon>
  ),
  reserve: (
    <AdminNavIcon>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
    </AdminNavIcon>
  ),
  catalog: (
    <AdminNavIcon>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </AdminNavIcon>
  ),
  ads: (
    <AdminNavIcon>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </AdminNavIcon>
  ),
  settings: (
    <AdminNavIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </AdminNavIcon>
  ),
};

const NAV_ITEMS = [
  { href: "/admin",          label: "Overview", icon: icons.overview },
  { href: "/admin/users",    label: "Users",    icon: icons.users    },
  { href: "/admin/reserve",  label: "Reserve",  icon: icons.reserve  },
  { href: "/admin/catalog",  label: "Catalog",  icon: icons.catalog  },
  { href: "/admin/ads",      label: "Ads",      icon: icons.ads      },
  { href: "/admin/settings", label: "Settings", icon: icons.settings },
] as const;

type Props = {
  expanded: boolean;
  onNavigate?: () => void;
};

export function AdminSidebar({ expanded, onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed top-14 bottom-0 left-0 z-50 flex w-60 flex-col bg-brand-900 text-white shadow-xl transition-transform duration-200",
        expanded ? "translate-x-0" : "-translate-x-full",
        "md:sticky md:z-auto md:h-[calc(100vh-3.5rem)] md:shrink-0 md:shadow-none md:transition-[width] md:translate-x-0",
        expanded ? "md:w-60" : "md:w-16",
      )}
    >
      <nav className="flex flex-col gap-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={!expanded ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white",
                !expanded && "justify-center px-0",
              )}
            >
              {item.icon}
              {expanded && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
