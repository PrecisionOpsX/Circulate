import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { CREDIT_RULES } from "@/lib/constants";

export const metadata: Metadata = { title: "How it works" };

const FAQ = [
  {
    q: "What are credits?",
    a: "Credits are Circulate's internal trading currency. They aren't money and can't be cashed out. They simply keep value moving inside the community.",
  },
  {
    q: "How do I get credits?",
    a: `Everyone starts at ${CREDIT_RULES.STARTING_BALANCE}. You earn credits by selling goods or services to other members.`,
  },
  {
    q: "Can I go negative?",
    a: `Yes, down to ${CREDIT_RULES.MIN_BALANCE} credits. Once your balance is below zero, buying is paused until you earn your way back to a positive balance.`,
  },
  {
    q: "Is there a fee?",
    a: `A ${CREDIT_RULES.FEE_RATE * 100}% fee is taken from each completed trade and held in a shared platform reserve.`,
  },
];

export default function HowItWorksPage() {
  return (
    <PageShell
      title="How Circulate works"
      intro="Trade without cash. Earn credits when you sell, spend them when you buy."
    >
      <dl className="space-y-6">
        {FAQ.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold">{item.q}</dt>
            <dd className="mt-1 text-sm text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
    </PageShell>
  );
}
