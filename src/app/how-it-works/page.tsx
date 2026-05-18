import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { CREDIT_RULES } from "@/lib/constants";
import { getPlatformSettings } from "@/lib/platform-settings";
import { formatCredits } from "@/lib/utils";

export const metadata: Metadata = { title: "How it works" };

export default async function HowItWorksPage() {
  const { signupCreditGrant } = await getPlatformSettings();

  const faq = [
    {
      q: "What are credits?",
      a: "Credits are Circulate's internal trading currency. They aren't money and can't be cashed out. They simply keep value moving inside the community.",
    },
    {
      q: "How do I get credits?",
      a: `We credit every new account with ${formatCredits(signupCreditGrant)} credits at signup so you can start trading right away. From there you earn more by selling goods or services to other members, or you can buy a top-up.`,
    },
    {
      q: "What if I run out of credits?",
      a: "Sell something you no longer need, or buy a credit top-up. Wallets cannot go below zero, so you'll never owe the platform anything.",
    },
    {
      q: "Is there a fee?",
      a: `A ${CREDIT_RULES.FEE_RATE * 100}% fee is taken from each completed trade and held in a shared platform reserve.`,
    },
  ];

  return (
    <PageShell
      title="How Circulate works"
      intro="Trade without cash. Earn credits when you sell, spend them when you buy."
    >
      <dl className="space-y-6">
        {faq.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold">{item.q}</dt>
            <dd className="mt-1 text-sm text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
    </PageShell>
  );
}
