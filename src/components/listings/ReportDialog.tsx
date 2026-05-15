"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { reportListingAction, type ReportFormState } from "@/app/reports/actions";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { REPORT_REASONS } from "@/lib/constants";

const initialState: ReportFormState = { ok: false };

const flagIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

/** "Report this listing" trigger + moderation report modal. */
export function ReportDialog({
  listingId,
  isAuthenticated,
}: {
  listingId: string;
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(reportListingAction, initialState);
  const errors = state.fieldErrors ?? {};

  if (!isAuthenticated) {
    return (
      <Link
        href={`/login?next=/listings/${listingId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-danger"
      >
        {flagIcon}
        Report this listing
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-danger"
      >
        {flagIcon}
        Report this listing
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Report listing">
        {state.ok ? (
          <div className="space-y-4">
            <Alert variant="success">{state.message}</Alert>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-brand-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4" noValidate>
            {state.error && <Alert variant="error">{state.error}</Alert>}
            <input type="hidden" name="listingId" value={listingId} />

            <Field htmlFor="reason" label="Reason" required error={errors.reason}>
              <Select
                id="reason"
                name="reason"
                defaultValue=""
                invalid={Boolean(errors.reason)}
                required
              >
                <option value="" disabled>
                  Choose a reason
                </option>
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              htmlFor="details"
              label="Details"
              error={errors.details}
              hint="Optional. Add anything that helps our team review this."
            >
              <Textarea
                id="details"
                name="details"
                rows={3}
                maxLength={1000}
                placeholder="What's wrong with this listing?"
                invalid={Boolean(errors.details)}
              />
            </Field>

            <div className="flex items-center gap-3">
              <SubmitButton variant="danger" pendingLabel="Submitting…">
                Submit report
              </SubmitButton>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
