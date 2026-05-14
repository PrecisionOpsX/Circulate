import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "FAQ" };

const QUESTIONS = [
  {
    q: "Is Circulate free to use?",
    a: "Yes. Creating an account and listing items is free. A small fee applies only to completed trades.",
  },
  {
    q: "Do I need a phone number?",
    a: "Email verification is required. Phone verification is optional but earns you a trust badge that buyers and sellers can see.",
  },
  {
    q: "What can I trade?",
    a: "Both goods and services, as long as they're lawful and accurately described.",
  },
  {
    q: "How is trust handled?",
    a: "Profiles show verified badges, completed trade counts, and ratings from past trades.",
  },
];

export default function FaqPage() {
  return (
    <PageShell
      title="Frequently asked questions"
      intro="Quick answers about trading on Circulate."
    >
      <dl className="space-y-6">
        {QUESTIONS.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold">{item.q}</dt>
            <dd className="mt-1 text-sm text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 text-sm text-muted">
        See also{" "}
        <Link href="/how-it-works" className="font-medium text-brand-700">
          how Circulate works
        </Link>
        .
      </p>
    </PageShell>
  );
}
