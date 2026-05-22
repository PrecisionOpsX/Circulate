import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setUserRoleAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Profile } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Users" };

/** Friendly copy for the ?error= codes set by setUserRoleAction. */
const ERROR_MESSAGES: Record<string, string> = {
  invalid: "That request was missing required information.",
  self: "You can't remove your own admin access. Ask another admin to do it.",
  failed: "Something went wrong updating that user. Please try again.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const me = await requireAdmin();
  const { updated, error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Profile[]>();

  const users = data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-brand-900">Users</h2>
        <p className="mt-1 text-sm text-muted">
          {users.length} {users.length === 1 ? "member" : "members"}. Promote a
          member to admin, or revoke admin access.
        </p>
      </header>

      {updated && <Alert variant="success">User role updated.</Alert>}
      {error && (
        <Alert variant="error">
          {ERROR_MESSAGES[error] ?? "Something went wrong."}
        </Alert>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {users.map((u) => {
          const isSelf = u.id === me.id;
          const isAdmin = u.role === "admin";
          return (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-brand-900">
                    {u.display_name}
                  </p>
                  {isAdmin && <Badge variant="blue">Admin</Badge>}
                  {u.status !== "active" && (
                    <Badge variant="danger">{u.status}</Badge>
                  )}
                  {isSelf && <Badge variant="neutral">You</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Joined{" "}
                  {new Date(u.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Promote / demote. Self-demotion is blocked here and in
                  the action; the DB role-guard trigger is the backstop. */}
              <form action={setUserRoleAction}>
                <input type="hidden" name="userId" value={u.id} />
                <input
                  type="hidden"
                  name="role"
                  value={isAdmin ? "user" : "admin"}
                />
                <SubmitButton
                  size="sm"
                  variant={isAdmin ? "secondary" : "primary"}
                  disabled={isSelf && isAdmin}
                  pendingLabel="Saving…"
                >
                  {isAdmin ? "Remove admin" : "Make admin"}
                </SubmitButton>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
