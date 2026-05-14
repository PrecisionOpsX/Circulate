import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy" };

/**
 * Placeholder Privacy Policy. Editable via the admin static-content system
 * in Milestone 5; replace with reviewed legal copy before launch.
 */
export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy"
      intro="Placeholder privacy policy for the Circulate MVP. Replace with reviewed legal copy before launch."
    >
      <div className="space-y-6 text-sm leading-6 text-foreground">
        <section>
          <h2 className="text-base font-semibold">Information we collect</h2>
          <p className="mt-1 text-muted">
            Account details (name, email, optional phone number), listings you
            create, transactions, messages, and basic usage analytics.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">How we use it</h2>
          <p className="mt-1 text-muted">
            To operate the marketplace, verify accounts, prevent fraud and
            duplicate accounts, process credit transactions, and improve the
            product.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">Third-party processors</h2>
          <p className="mt-1 text-muted">
            {APP_NAME} relies on Supabase (database, auth, storage), Twilio
            (SMS verification), and analytics providers. Each processes data
            only as needed to provide their service.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">Your choices</h2>
          <p className="mt-1 text-muted">
            You can edit your profile, and request account deletion by
            contacting support. Verified contact details are retained for
            fraud prevention while your account is active.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
