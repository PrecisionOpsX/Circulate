import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (await getSessionUser()) redirect("/dashboard");

  const { next, error } = await searchParams;

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to your {`Circulate`} account.</p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6">
        <LoginForm next={next} />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        New to Circulate?{" "}
        <Link href="/signup" className="font-medium text-brand-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
