import type { Metadata } from "next";
import { getPlatformSettings } from "@/lib/platform-settings";
import { updatePlatformSettingsAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Settings" };

/** Friendly copy for the ?error= codes set by updatePlatformSettingsAction. */
const ERROR_MESSAGES: Record<string, string> = {
  invalid:
    "Please enter a valid number for every field. The fee must be between 0 and 100.",
  failed: "Something went wrong saving the settings. Please try again.",
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const { updated, error } = await searchParams;
  const settings = await getPlatformSettings();

  // Stored as a 0-1 rate, shown and edited as a percentage.
  const feePercent = Number((settings.transactionFeeRate * 100).toFixed(2));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-brand-900">
          Platform settings
        </h2>
        <p className="mt-1 text-sm text-muted">
          These values control credits and fees across the live marketplace.
        </p>
      </header>

      {updated && <Alert variant="success">Platform settings saved.</Alert>}
      {error && (
        <Alert variant="error">
          {ERROR_MESSAGES[error] ?? "Something went wrong."}
        </Alert>
      )}

      <form
        action={updatePlatformSettingsAction}
        className="space-y-5 rounded-2xl border border-border bg-surface p-6"
      >
        <Field
          htmlFor="signupCreditGrant"
          label="Signup credit grant"
          hint="Credits given to each new account when it is created."
          required
        >
          <Input
            id="signupCreditGrant"
            name="signupCreditGrant"
            type="number"
            min={0}
            step="0.01"
            defaultValue={settings.signupCreditGrant}
            required
          />
        </Field>

        <Field
          htmlFor="transactionFeePercent"
          label="Transaction fee (%)"
          hint="Percentage taken from every completed sale into the reserve wallet."
          required
        >
          <Input
            id="transactionFeePercent"
            name="transactionFeePercent"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={feePercent}
            required
          />
        </Field>

        <Field
          htmlFor="monthlyCreditPurchaseCap"
          label="Monthly purchase cap"
          hint="Most credits a single user can buy within any rolling 30 days."
          required
        >
          <Input
            id="monthlyCreditPurchaseCap"
            name="monthlyCreditPurchaseCap"
            type="number"
            min={0}
            step="1"
            defaultValue={settings.monthlyCreditPurchaseCap}
            required
          />
        </Field>

        <div className="flex justify-end border-t border-border pt-4">
          <SubmitButton size="sm" pendingLabel="Saving…">
            Save settings
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
