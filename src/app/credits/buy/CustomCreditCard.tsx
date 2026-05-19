"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CUSTOM_CREDITS } from "@/lib/constants";
import { startCheckoutAction } from "@/app/credits/actions";

const RATE_LABEL = `$${(CUSTOM_CREDITS.RATE_USD_CENTS / 100).toFixed(2)} / credit`;

/**
 * Custom-amount credit purchase card. Sits in the buy-credits grid
 * alongside the fixed packages. Updates the displayed dollar total
 * live as the user types, then submits to startCheckoutAction.
 */
export function CustomCreditCard() {
  const [value, setValue] = useState("");

  const parsed = Number(value);
  const valid =
    value !== "" &&
    Number.isFinite(parsed) &&
    Number.isInteger(parsed) &&
    parsed >= CUSTOM_CREDITS.MIN &&
    parsed <= CUSTOM_CREDITS.MAX;

  const cents = valid ? parsed * CUSTOM_CREDITS.RATE_USD_CENTS : 0;
  const dollars = (cents / 100).toFixed(2);

  return (
    <form
      action={startCheckoutAction}
      className="relative flex flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
    >
      <p className="text-sm font-semibold text-circ-blue">Custom amount</p>
      <p className="mt-3 text-4xl font-extrabold text-brand-900">
        {valid ? parsed : value || 0}
        <span className="ml-1 text-base font-semibold text-muted">credits</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        ${dollars} USD ({RATE_LABEL})
      </p>
      <p className="mt-3 text-sm text-foreground">
        Pick any amount from {CUSTOM_CREDITS.MIN} to{" "}
        {CUSTOM_CREDITS.MAX.toLocaleString()} credits.
      </p>

      <div className="mt-4">
        <label htmlFor="customCredits" className="sr-only">
          Custom credit amount
        </label>
        <Input
          id="customCredits"
          name="customCredits"
          type="number"
          inputMode="numeric"
          min={CUSTOM_CREDITS.MIN}
          max={CUSTOM_CREDITS.MAX}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${CUSTOM_CREDITS.MIN} to ${CUSTOM_CREDITS.MAX.toLocaleString()}`}
          required
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        className="mt-6 w-full"
        disabled={!valid}
      >
        {valid ? `Buy ${parsed} credits` : "Enter an amount"}
      </Button>
    </form>
  );
}
