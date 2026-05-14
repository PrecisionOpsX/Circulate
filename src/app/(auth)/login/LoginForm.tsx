"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthFormState } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initialState: AuthFormState = { ok: false };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}

      <Field htmlFor="email" label="Email" required error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(errors.email)}
          required
        />
      </Field>

      <Field htmlFor="password" label="Password" required error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(errors.password)}
          required
        />
      </Field>

      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-brand-700"
        >
          Forgot password?
        </Link>
      </div>

      <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
        Log in
      </SubmitButton>
    </form>
  );
}
