"use client";

import { useActionState, useState } from "react";
import {
  sendPhoneOtpAction,
  verifyPhoneOtpAction,
  type AuthFormState,
} from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: AuthFormState = { ok: false };

type Props = {
  /** Whether Twilio/phone auth is wired up in Supabase. */
  enabled: boolean;
  /** Already-verified phone number, if any. */
  verifiedPhone: string | null;
};

/**
 * Two-step phone verification: enter number -> receive SMS code -> confirm.
 * The current step is derived from the two action states (no effects) plus
 * a `backToPhone` override for the "use a different number" affordance.
 */
export function PhoneVerification({ enabled, verifiedPhone }: Props) {
  const [phone, setPhone] = useState("");
  const [backToPhone, setBackToPhone] = useState(false);

  const [sendState, sendAction] = useActionState(sendPhoneOtpAction, initial);
  const [verifyState, verifyAction] = useActionState(
    verifyPhoneOtpAction,
    initial,
  );

  // Step derived purely from props + action results.
  const step: "phone" | "otp" | "done" =
    verifiedPhone || verifyState.ok
      ? "done"
      : sendState.ok && !backToPhone
        ? "otp"
        : "phone";

  if (!enabled) {
    return (
      <Alert variant="warning">
        Phone verification isn&apos;t enabled yet. Configure the Twilio phone
        provider in Supabase, then set{" "}
        <code className="font-mono text-xs">
          NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true
        </code>
        .
      </Alert>
    );
  }

  if (step === "done") {
    return (
      <Alert variant="success">
        Phone number verified
        {verifiedPhone ? (
          <>
            {": "}
            <span className="font-medium">{verifiedPhone}</span>
          </>
        ) : null}
        .
      </Alert>
    );
  }

  if (step === "otp") {
    const errors = verifyState.fieldErrors ?? {};
    return (
      <form action={verifyAction} className="space-y-3">
        {verifyState.error && (
          <Alert variant="error">{verifyState.error}</Alert>
        )}
        <input type="hidden" name="phone" value={phone} />
        <Field
          htmlFor="token"
          label="Enter the 6-digit code"
          required
          error={errors.token}
          hint={`Sent to ${phone}`}
        >
          <Input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            invalid={Boolean(errors.token)}
            required
          />
        </Field>
        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Verifying…">Verify</SubmitButton>
          <button
            type="button"
            onClick={() => setBackToPhone(true)}
            className="text-sm text-muted hover:text-foreground"
          >
            Use a different number
          </button>
        </div>
      </form>
    );
  }

  // step === "phone"
  const errors = sendState.fieldErrors ?? {};
  return (
    <form
      action={sendAction}
      // Clear the override so a fresh successful send advances to the OTP step.
      onSubmit={() => setBackToPhone(false)}
      className="space-y-3"
    >
      {sendState.error && <Alert variant="error">{sendState.error}</Alert>}
      <Field
        htmlFor="phone"
        label="Phone number"
        required
        error={errors.phone}
        hint="International format, e.g. +14155550100"
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+14155550100"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          invalid={Boolean(errors.phone)}
          required
        />
      </Field>
      <SubmitButton pendingLabel="Sending code…">Send code</SubmitButton>
    </form>
  );
}
