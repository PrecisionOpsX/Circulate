import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminHeader";

/**
 * Admin section shell. requireAdmin() here redirects non-admins, so
 * every /admin/* route is gated in one place. The root layout drops the
 * public site header/footer for /admin paths, so this section supplies
 * its own chrome.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <>
      <AdminHeader displayName={user.profile.display_name} />

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </div>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 text-xs text-muted">
          Circulate admin panel. Changes here affect the live marketplace.
        </div>
      </footer>
    </>
  );
}
