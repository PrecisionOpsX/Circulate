"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthFormState } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initialState: AuthFormState = { ok: false };

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Field htmlFor="displayName" label="Name" required error={errors.displayName}>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder="Jordan Rivera"
          invalid={Boolean(errors.displayName)}
          required
        />
      </Field>

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

      <Field
        htmlFor="password"
        label="Password"
        required
        error={errors.password}
        hint="At least 8 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          required
        />
      </Field>

      <Field
        htmlFor="confirmPassword"
        label="Confirm password"
        required
        error={errors.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.confirmPassword)}
          required
        />
      </Field>

      <div>
        <Checkbox
          id="acceptedTerms"
          name="acceptedTerms"
          label={
            <>
              I agree to the{" "}
              <Link href="/terms" className="text-brand-700 underline" target="_blank">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-brand-700 underline" target="_blank">
                Privacy Policy
              </Link>
              .
            </>
          }
        />
        {errors.acceptedTerms && (
          <p className="mt-1 text-sm text-danger">{errors.acceptedTerms}</p>
        )}
      </div>

      <SubmitButton className="w-full" size="lg" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
