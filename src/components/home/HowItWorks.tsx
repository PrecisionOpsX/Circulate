import { Reveal } from "@/components/ui/Reveal";

const STEPS = [
  {
    title: "List what you have",
    body: "Post goods or a service in minutes. Add photos, pick a category, and set your price in credits.",
    accent: "bg-circ-green",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    title: "Trade with neighbours",
    body: "Buyers spend credits, sellers earn them. Chat, agree, and complete the trade with a quick scan.",
    accent: "bg-circ-blue",
    icon: <path d="M7 8h10l-3-3m3 11H7l3 3" />,
  },
  {
    title: "Keep credits moving",
    body: "Spend what you earn on anything else in the marketplace. Value stays in your community.",
    accent: "bg-gold-400",
    icon: (
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16M21 3v5h-5M3 21v-5h5" />
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-circ-blue">
          How it works
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
          Three steps to your first trade
        </h2>
        <p className="mt-3 text-muted">
          No bank account, no haggling over cash. Just list, trade, and repeat.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal
            key={step.title}
            delay={i * 120}
            className="group relative rounded-2xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.accent} text-white`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {step.icon}
                </svg>
              </span>
              <span className="text-5xl font-extrabold text-brand-100 transition-colors group-hover:text-brand-200">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-bold text-brand-900">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {step.body}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
