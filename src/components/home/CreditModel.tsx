import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { CREDIT_RULES } from "@/lib/constants";

const RULES = [
  {
    value: "0",
    label: "Starting balance",
    body: "Every member begins at zero and earns from there.",
  },
  {
    value: CREDIT_RULES.MIN_BALANCE.toString(),
    label: "Credit floor",
    body: "Go a little negative, then sell to bring your balance back up.",
  },
  {
    value: `${CREDIT_RULES.FEE_RATE * 100}%`,
    label: "Platform fee",
    body: "A small slice of each trade funds the shared reserve.",
  },
];

/** Dark, premium section explaining the credit model with a worked example. */
export function CreditModel() {
  return (
    <section className="relative overflow-hidden bg-brand-900 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-circ-blue/25 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-circ-green/25 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:py-24 lg:grid-cols-2">
        {/* copy + rules */}
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-300">
            The credit model
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            A currency that keeps moving
          </h2>
          <p className="mt-4 max-w-md text-brand-200">
            Credits are not money and cannot be cashed out. They simply keep
            value circulating between people, so the whole community benefits.
          </p>

          <dl className="mt-8 space-y-5">
            {RULES.map((rule) => (
              <div key={rule.label} className="flex gap-4">
                <dd className="w-16 shrink-0 text-3xl font-extrabold text-gold-300">
                  {rule.value}
                </dd>
                <div>
                  <dt className="font-semibold">{rule.label}</dt>
                  <p className="text-sm text-brand-200">{rule.body}</p>
                </div>
              </div>
            ))}
          </dl>

          <Button asChild size="lg" variant="gold" className="mt-8">
            <Link href="/how-it-works">See the full breakdown</Link>
          </Button>
        </Reveal>

        {/* worked-example receipt card */}
        <Reveal delay={120}>
          <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur sm:p-8">
            <p className="text-sm text-brand-200">Example trade</p>
            <p className="mt-1 text-lg font-semibold">
              Selling a desk lamp for 25 credits
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <Row label="Sale price" value="25.00" />
              <Row label="Platform fee (6%)" value="- 1.50" muted />
              <div className="h-px bg-white/15" />
              <div className="flex items-center justify-between">
                <span className="font-semibold">You receive</span>
                <span className="text-2xl font-extrabold text-circ-green">
                  + 23.50
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400 text-brand-900">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3H9m0 0h5" strokeLinecap="round" />
                </svg>
              </span>
              <p className="text-sm text-brand-200">
                The <span className="font-semibold text-white">1.50</span> fee
                goes to the community reserve wallet, not a bank.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-brand-200">{label}</span>
      <span className={muted ? "text-brand-300" : "font-semibold text-white"}>
        {value}
      </span>
    </div>
  );
}
