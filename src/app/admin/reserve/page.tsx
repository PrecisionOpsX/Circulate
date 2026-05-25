import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCredits } from "@/lib/utils";
import { grantCreditsAction, mintCreditsAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Profile, AdminAuditLog } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Reserve" };

const GRANT_ERRORS: Record<string, string> = {
  invalid:      "Please enter a valid recipient and a positive amount.",
  insufficient: "The reserve balance is too low for that grant amount.",
  no_wallet:    "That user does not have a wallet yet.",
  no_users:     "No user wallets were found to broadcast to.",
  no_function:  "The grant function is missing from the database. Please run migration 0022 in your Supabase SQL Editor.",
  failed:       "Something went wrong processing the grant. Please try again.",
};

const MINT_ERRORS: Record<string, string> = {
  invalid_mint: "Please enter a positive amount to mint.",
  mint_failed:  "Something went wrong creating the credits. Please try again.",
};

type GrantLog = Pick<AdminAuditLog,
  "id" | "admin_id" | "action" | "target_id" | "detail" | "created_at"
>;

export default async function AdminReservePage({
  searchParams,
}: {
  searchParams: Promise<{
    granted?: string;
    minted?: string;
    error?: string;
  }>;
}) {
  const me = await requireAdmin();
  const { granted, minted, error } = await searchParams;

  const supabase = await createClient();

  const [reserveRes, usersRes, logsRes] = await Promise.all([
    supabase
      .from("wallets")
      .select("balance")
      .eq("is_reserve", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name", { ascending: true })
      .returns<Pick<Profile, "id" | "display_name">[]>(),
    supabase
      .from("admin_audit_log")
      .select("id, admin_id, action, target_id, detail, created_at")
      .in("action", ["grant_credits", "mint_credits"])
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<GrantLog[]>(),
  ]);

  const reserveBalance = reserveRes.data?.balance ?? 0;
  const users = usersRes.data ?? [];
  const logs = logsRes.data ?? [];

  // Collect unique user IDs from log rows for display name lookup.
  const logUserIds = new Set<string>();
  for (const log of logs) {
    if (log.admin_id) logUserIds.add(log.admin_id);
    if (log.target_id) logUserIds.add(log.target_id);
  }

  const profileMap = new Map<string, string>();
  if (logUserIds.size > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [...logUserIds])
      .returns<Pick<Profile, "id" | "display_name">[]>();
    for (const p of profileRows ?? []) {
      profileMap.set(p.id, p.display_name);
    }
  }

  const isMintError  = error === "invalid_mint" || error === "mint_failed";
  const isGrantError = !isMintError && !!error;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-brand-900">
          Reserve wallet
        </h2>
        <p className="mt-1 text-sm text-muted">
          Credits collected from platform fees. Mint new credits or grant
          them to users for refunds, support, or promotions.
        </p>
      </header>

      {/* Balance card */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">Current reserve balance</p>
        <p className="mt-1 text-4xl font-bold text-brand-600">
          {formatCredits(reserveBalance)}
        </p>
        <p className="mt-1 text-xs text-muted">
          Grows automatically each time a transaction fee is collected.
        </p>
      </section>

      {/* ---- Mint credits ---- */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-brand-900">
            Create credits (mint)
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            Add new credits directly to the reserve without debiting any
            source. Use this when the reserve needs topping up beyond
            automatic fee collection.
          </p>
        </div>

        {minted && (
          <Alert variant="success">Credits minted and added to the reserve.</Alert>
        )}
        {isMintError && (
          <Alert variant="error">
            {MINT_ERRORS[error ?? ""] ?? "Something went wrong."}
          </Alert>
        )}

        <form
          action={mintCreditsAction}
          className="space-y-5 rounded-2xl border border-border bg-surface p-6"
        >
          <Field
            htmlFor="mintAmount"
            label="Amount (credits)"
            hint="Positive number. These credits are created from nothing."
            required
          >
            <Input
              id="mintAmount"
              name="mintAmount"
              type="number"
              min={0.01}
              step="0.01"
              placeholder="0.00"
              required
            />
          </Field>

          <Field
            htmlFor="mintNote"
            label="Note (optional)"
            hint="Reason stored in the audit log."
          >
            <Input
              id="mintNote"
              name="mintNote"
              type="text"
              maxLength={200}
              placeholder="e.g. Monthly platform top-up"
            />
          </Field>

          <div className="flex justify-end border-t border-border pt-4">
            <SubmitButton size="sm" variant="secondary" pendingLabel="Minting...">
              Mint credits
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* ---- Grant credits ---- */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-brand-900">
            Grant credits to users
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            Transfer credits from the reserve to one user or broadcast the
            same amount to every user at once.
          </p>
        </div>

        {granted && (
          <Alert variant="success">Credits granted successfully.</Alert>
        )}
        {isGrantError && (
          <Alert variant="error">
            {GRANT_ERRORS[error ?? ""] ?? "Something went wrong."}
          </Alert>
        )}

        <form
          action={grantCreditsAction}
          className="space-y-5 rounded-2xl border border-border bg-surface p-6"
        >
          <Field
            htmlFor="recipientId"
            label="Recipient"
            hint="Choose a specific user or broadcast to everyone."
            required
          >
            <select
              id="recipientId"
              name="recipientId"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">Select a recipient...</option>
              <option value="__all__">
                All users (broadcast)
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                  {u.id === me.id ? " (you)" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field
            htmlFor="amount"
            label="Amount (credits)"
            hint="For a broadcast, each user receives this amount individually."
            required
          >
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              max={reserveBalance}
              placeholder="0.00"
              required
            />
          </Field>

          <Field
            htmlFor="note"
            label="Note (optional)"
            hint="Reason for the grant. Stored in the audit log."
          >
            <Input
              id="note"
              name="note"
              type="text"
              maxLength={200}
              placeholder="e.g. Platform promotion — May 2026"
            />
          </Field>

          <div className="flex justify-end border-t border-border pt-4">
            <SubmitButton size="sm" pendingLabel="Granting...">
              Grant credits
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* ---- History ---- */}
      {logs.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-brand-900">
            Recent activity
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {logs.map((log) => {
              const isMint = log.action === "mint_credits";
              const detail = log.detail as Record<string, unknown>;
              const adminName =
                profileMap.get(log.admin_id) ?? "Unknown admin";

              let label: string;
              let badge: string;

              if (isMint) {
                const amt = detail.amount as number ?? 0;
                label = `Minted ${formatCredits(amt)} to reserve`;
                badge = `+${formatCredits(amt)}`;
              } else if (!log.target_id) {
                // Broadcast grant (all_users)
                const each  = detail.amount_each as number ?? 0;
                const total = detail.total as number ?? 0;
                const count = detail.user_count as number ?? 0;
                label = `${formatCredits(each)} each to all ${count} users (total ${formatCredits(total)})`;
                badge = `-${formatCredits(total)}`;
              } else {
                // Single-user grant
                const amt = detail.amount as number ?? 0;
                const recipientName =
                  profileMap.get(log.target_id) ?? "Unknown user";
                label = `${formatCredits(amt)} to ${recipientName}`;
                badge = `-${formatCredits(amt)}`;
              }

              const note = detail.note as string | undefined;

              return (
                <li
                  key={log.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-900">
                      {label}
                    </p>
                    {note && (
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {note}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted">
                      By {adminName} on{" "}
                      {new Date(log.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isMint
                        ? "bg-brand-50 text-brand-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {badge}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
