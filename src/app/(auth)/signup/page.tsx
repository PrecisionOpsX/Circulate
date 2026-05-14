import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  // Signed-in users have no business here.
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        Start trading with community credits. It&apos;s free.
      </p>
      <div className="mt-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
