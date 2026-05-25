import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Admin section shell. requireAdmin() here redirects non-admins, so
 * every /admin/* route is gated in one place.
 *
 * The root layout suppresses the public site header/footer for /admin paths;
 * AdminShell supplies its own chrome (collapsible sidebar + top bar + footer).
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AdminShell displayName={user.profile.display_name}>
      {children}
    </AdminShell>
  );
}
