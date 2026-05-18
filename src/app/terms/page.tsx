import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { APP_NAME, CREDIT_RULES } from "@/lib/constants";
import { getPlatformSettings } from "@/lib/platform-settings";
import { formatCredits } from "@/lib/utils";

export const metadata: Metadata = { title: "Terms of Service" };

/**
 * Placeholder Terms of Service. The admin-managed static content system
 * (Milestone 5) will let this be edited without a deploy.
 */
export default async function TermsPage() {
  const { signupCreditGrant } = await getPlatformSettings();
  return (
    <PageShell
      title="Terms of Service"
      intro="Placeholder terms for the Circulate MVP. Replace with reviewed legal copy before launch."
    >
      <div className="space-y-6 text-sm leading-6 text-foreground">
        <section>
          <h2 className="text-base font-semibold">1. The Circulate platform</h2>
          <p className="mt-1 text-muted">
            {APP_NAME} is a local marketplace where members trade goods and
            services using platform credits rather than cash. Credits have no
            monetary value and cannot be redeemed for currency.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">2. Accounts</h2>
          <p className="mt-1 text-muted">
            You must provide accurate information, verify your email, and keep
            your credentials secure. One account per person; duplicate
            accounts may be suspended.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">3. Credits & fees</h2>
          <p className="mt-1 text-muted">
            Every new member is credited {formatCredits(signupCreditGrant)}{" "}
            credits at signup. Wallet balances cannot go below zero; you can
            only spend what you have. A {CREDIT_RULES.FEE_RATE * 100}% platform
            fee applies to each completed transaction and is paid into the
            platform reserve.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">4. Conduct</h2>
          <p className="mt-1 text-muted">
            Listings must be lawful and accurately described. Harassment,
            fraud, and prohibited items are not allowed and may result in
            removal or suspension.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">5. Disclaimer</h2>
          <p className="mt-1 text-muted">
            The platform is provided &quot;as is&quot; during the MVP period.
            {" "}
            {APP_NAME} is not a party to trades between members.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
