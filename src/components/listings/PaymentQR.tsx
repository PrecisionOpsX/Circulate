"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

/**
 * In-person payment QR. The buyer scans on their phone, lands on /pay/[id],
 * confirms, and the seller's wallet updates immediately. Listed under the
 * owner's view on a listing detail page.
 */
export function PaymentQR({ payUrl }: { payUrl: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(payUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable, no-op */
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-brand-900">
            Accept payment in person
          </h3>
          <p className="mt-1 text-xs text-muted">
            Have the buyer scan this code to pay you in credits from their
            phone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-sm font-semibold text-circ-blue hover:text-circ-blue-dark"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      {show && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="rounded-2xl border border-border bg-white p-4">
            <QRCodeSVG
              value={payUrl}
              size={196}
              level="M"
              bgColor="#ffffff"
              fgColor="#0b1f3a"
            />
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            {copied ? "Link copied" : "Copy payment link"}
          </button>
        </div>
      )}
    </div>
  );
}
