import type { Metadata } from "next";
import Link from "next/link";
import { ResendEmailForm } from "./ResendEmailForm";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 5L2 7" />
        </svg>
      </div>
      <h1 className="mt-4 text-2xl font-semibold">Check your email</h1>
      <p className="mt-2 text-sm text-muted">
        We&apos;ve sent a verification link
        {email ? (
          <>
            {" "}
            to <span className="font-medium text-foreground">{email}</span>
          </>
        ) : null}
        . Click it to activate your account.
      </p>

      {email && (
        <div className="mt-6">
          <ResendEmailForm email={email} />
        </div>
      )}

      <p className="mt-6 text-sm text-muted">
        Already verified?{" "}
        <Link href="/login" className="font-medium text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
