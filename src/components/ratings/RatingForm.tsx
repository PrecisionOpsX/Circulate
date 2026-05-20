"use client";

import { useActionState } from "react";
import {
  submitRatingAction,
  type RatingFormState,
} from "@/app/ratings/actions";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { RatingInput } from "@/components/ratings/RatingInput";

const initialState: RatingFormState = { ok: false };

export function RatingForm({
  transactionId,
  rateeName,
}: {
  transactionId: string;
  rateeName: string;
}) {
  const [state, formAction] = useActionState(
    submitRatingAction,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="transactionId" value={transactionId} />

      <div>
        <p className="text-sm font-medium text-foreground">
          How was your trade with{" "}
          <span className="font-semibold">{rateeName}</span>?
        </p>
        <div className="mt-3">
          <RatingInput />
        </div>
        {errors.stars && (
          <p className="mt-1 text-sm text-danger">{errors.stars}</p>
        )}
      </div>

      <Field
        htmlFor="review"
        label="Review (optional)"
        error={errors.review}
        hint="A short note for the community. Max 1000 characters."
      >
        <Textarea
          id="review"
          name="review"
          rows={4}
          maxLength={1000}
          placeholder="Was the item as described? Were they easy to coordinate with?"
          invalid={Boolean(errors.review)}
        />
      </Field>

      <SubmitButton pendingLabel="Submitting...">Submit rating</SubmitButton>
    </form>
  );
}
