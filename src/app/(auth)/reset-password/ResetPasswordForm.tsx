"use client";

import { useActionState } from "react";
import {
  updatePasswordAction,
  type AuthFormState,
} from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initialState: AuthFormState = { ok: false };

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(
    updatePasswordAction,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Field
        htmlFor="password"
        label="New password"
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
        label="Confirm new password"
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

      <SubmitButton className="w-full" size="lg" pendingLabel="Updating…">
        Update password
      </SubmitButton>
    </form>
  );
}
