"use client";

import { useActionState } from "react";
import { payListingAction, type PayState } from "@/app/pay/actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: PayState = { ok: false };

/** Submit button + error surface for the pay confirmation page. */
export function PayConfirmForm({
  listingId,
  price,
}: {
  listingId: string;
  price: number;
}) {
  const [state, formAction] = useActionState(payListingAction, initial);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="listingId" value={listingId} />
      <SubmitButton
        size="lg"
        variant="gradient"
        className="w-full"
        pendingLabel="Sending credits..."
      >
        Confirm and pay {price.toFixed(2)} credits
      </SubmitButton>
    </form>
  );
}
