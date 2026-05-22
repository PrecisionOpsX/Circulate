import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCredits } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin" };

/**
 * Admin landing page. A few headline counts plus jump-off links to the
 * management screens. The /admin layout already gates this behind
 * requireAdmin(), so no extra auth check is needed here.
 */
export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [usersRes, adminsRes, activeListingsRes, completedTxnsRes, reserveRes] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin"),
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("wallets")
        .select("balance")
        .eq("is_reserve", true)
        .maybeSingle(),
    ]);

  const stats = [
    { label: "Total users", value: String(usersRes.count ?? 0) },
    { label: "Admins", value: String(adminsRes.count ?? 0) },
    { label: "Active listings", value: String(activeListingsRes.count ?? 0) },
    { label: "Completed trades", value: String(completedTxnsRes.count ?? 0) },
    {
      label: "Reserve balance",
      value: `${formatCredits(reserveRes.data?.balance ?? 0)} cr`,
    },
  ];

  const manage = [
    {
      href: "/admin/users",
      title: "Users",
      body: "Review members and grant or revoke admin access.",
    },
    {
      href: "/admin/reserve",
      title: "Reserve wallet",
      body: "View the fee reserve balance and grant credits to users.",
    },
    {
      href: "/admin/settings",
      title: "Platform settings",
      body: "Adjust signup credits, transaction fee, and purchase caps.",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-brand-900">Overview</h2>
        <p className="mt-1 text-sm text-muted">
          A snapshot of activity across Circulate.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <p className="text-sm text-muted">{s.label}</p>
              <p className="mt-1 text-3xl font-bold text-brand-600">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-brand-900">Manage</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {manage.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <h3 className="font-medium text-brand-900">{m.title}</h3>
              <p className="mt-1 text-sm text-muted">{m.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
