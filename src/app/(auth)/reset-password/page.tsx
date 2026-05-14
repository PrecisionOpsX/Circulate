import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/Alert";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Set a new password" };

/**
 * Reached via the recovery email link: /auth/callback exchanges the code
 * for a session, then forwards here. A valid session is required to set
 * the new password, so we check for one and otherwise show a recovery path.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Set a new password</h1>

      {user ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Choose a new password for your account.
          </p>
          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <Alert variant="error">
            This password reset link is invalid or has expired.
          </Alert>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-medium text-brand-700"
          >
            Request a new reset link
          </Link>
        </div>
      )}
    </div>
  );
}
