"use client";

import { useActionState } from "react";
import { resendEmailAction, type AuthFormState } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initialState: AuthFormState = { ok: false };

export function ResendEmailForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(resendEmailAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="email" value={email} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}
      <SubmitButton
        variant="secondary"
        className="w-full"
        pendingLabel="Sending…"
      >
        Resend verification email
      </SubmitButton>
    </form>
  );
}
