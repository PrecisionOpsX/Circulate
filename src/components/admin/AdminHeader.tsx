import Link from "next/link";
import { setAdminViewAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";

/**
 * Dark top bar for the admin section. Deliberately distinct from the
 * customer header so it is always obvious you are in the admin panel.
 */
export function AdminHeader({ displayName }: { displayName: string }) {
  return (
    <header className="sticky top-0 z-30 bg-brand-900 text-white">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <span className="font-bold tracking-tight">Circulate Admin</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/60 sm:inline">
              {displayName}
            </span>
            {/* Flips admin_view off and drops back into the customer app. */}
            <form action={setAdminViewAction}>
              <input type="hidden" name="view" value="customer" />
              <button
                type="submit"
                className="whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
              >
                Exit to customer view
              </button>
            </form>
          </div>
        </div>

        <AdminNav />
      </div>
    </header>
  );
}
