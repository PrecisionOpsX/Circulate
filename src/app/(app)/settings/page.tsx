import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isPhoneVerificationEnabled } from "@/lib/env";
import { signOutAction } from "@/app/(auth)/actions";
import { PhoneVerification } from "@/components/account/PhoneVerification";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { email, profile } = await requireUser("/settings");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your account and verification.
        </p>
      </header>

      {/* Email */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Email</h2>
        <p className="mt-1 text-sm text-muted">{email}</p>
        <div className="mt-3">
          {profile.email_verified ? (
            <Alert variant="success">Your email address is verified.</Alert>
          ) : (
            <Alert variant="warning">
              Your email isn&apos;t verified yet.{" "}
              <Link
                href={`/verify-email?email=${encodeURIComponent(email ?? "")}`}
                className="font-medium underline"
              >
                Verify now
              </Link>
            </Alert>
          )}
        </div>
      </section>

      {/* Phone */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Phone number</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Verify your phone by SMS to earn a trust badge.
        </p>
        <PhoneVerification
          enabled={isPhoneVerificationEnabled}
          verifiedPhone={profile.phone_verified ? profile.phone : null}
        />
      </section>

      {/* Session */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Session</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Sign out of Circulate on this device.
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </section>
    </div>
  );
}
