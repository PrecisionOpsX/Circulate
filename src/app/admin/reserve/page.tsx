import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCredits } from "@/lib/utils";
import { grantCreditsAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Profile, AdminAuditLog } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Reserve" };

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Please enter a valid user and a positive amount.",
  insufficient: "The reserve balance is too low for that grant amount.",
  no_wallet: "That user does not have a wallet yet.",
  failed: "Something went wrong processing the grant. Please try again.",
};

type GrantLog = Pick<AdminAuditLog, "id" | "admin_id" | "target_id" | "detail" | "created_at">;

export default async function AdminReservePage({
  searchParams,
}: {
  searchParams: Promise<{ granted?: string; error?: string }>;
}) {
  const me = await requireAdmin();
  const { granted, error } = await searchParams;

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
      .neq("id", me.id)
      .order("display_name", { ascending: true })
      .returns<Pick<Profile, "id" | "display_name">[]>(),
    supabase
      .from("admin_audit_log")
      .select("id, admin_id, target_id, detail, created_at")
      .eq("action", "grant_credits")
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<GrantLog[]>(),
  ]);

  const reserveBalance = reserveRes.data?.balance ?? 0;
  const users = usersRes.data ?? [];
  const logs = logsRes.data ?? [];

  // Collect unique user IDs from log rows so we can look up display names.
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

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-brand-900">
          Reserve wallet
        </h2>
        <p className="mt-1 text-sm text-muted">
          Credits collected from platform fees. Grant credits to users for
          refunds, support, or promotions.
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

      {/* Grant form */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-brand-900">
          Grant credits to a user
        </h3>

        {granted && (
          <Alert variant="success">Credits granted successfully.</Alert>
        )}
        {error && (
          <Alert variant="error">
            {ERROR_MESSAGES[error] ?? "Something went wrong."}
          </Alert>
        )}

        <form
          action={grantCreditsAction}
          className="space-y-5 rounded-2xl border border-border bg-surface p-6"
        >
          <Field
            htmlFor="recipientId"
            label="Recipient"
            hint="The user who will receive the credits."
            required
          >
            <select
              id="recipientId"
              name="recipientId"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            htmlFor="amount"
            label="Amount (credits)"
            hint="Must be a positive number and not exceed the reserve balance."
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
              placeholder="e.g. Refund for cancelled order #123"
            />
          </Field>

          <div className="flex justify-end border-t border-border pt-4">
            <SubmitButton size="sm" pendingLabel="Granting...">
              Grant credits
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* Grant history */}
      {logs.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-brand-900">
            Recent grants
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {logs.map((log) => {
              const detail = log.detail as {
                amount?: number;
                note?: string;
              };
              const recipientName =
                profileMap.get(log.target_id ?? "") ?? "Unknown user";
              const adminName =
                profileMap.get(log.admin_id) ?? "Unknown admin";
              return (
                <li
                  key={log.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-900">
                      {formatCredits(detail.amount ?? 0)} to {recipientName}
                    </p>
                    {detail.note && (
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {detail.note}
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
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                    +{formatCredits(detail.amount ?? 0)}
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
