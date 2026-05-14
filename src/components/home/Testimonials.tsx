import { Reveal } from "@/components/ui/Reveal";

const QUOTES = [
  {
    quote:
      "I cleared out my garage and earned enough credits to get my bike fixed. No money changed hands once.",
    name: "Maya R.",
    role: "Trades furniture and tools",
    accent: "bg-circ-green",
  },
  {
    quote:
      "As a tutor, Circulate lets me turn spare hours into things my family actually needs. It just works.",
    name: "Daniel O.",
    role: "Offers tutoring services",
    accent: "bg-circ-blue",
  },
  {
    quote:
      "It feels like a proper community, not a classifieds board. The verified badges make trading easy to trust.",
    name: "Priya S.",
    role: "Trades clothing and books",
    accent: "bg-gold-400",
  },
];

export function Testimonials() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-circ-green">
            Loved by traders
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
            Built for real communities
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <Reveal
              key={q.name}
              delay={i * 110}
              className="flex flex-col rounded-2xl border border-border bg-background p-7"
            >
              <div className="flex gap-0.5 text-gold-400">
                {Array.from({ length: 5 }).map((_, s) => (
                  <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
                  </svg>
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-brand-800">
                &ldquo;{q.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${q.accent} text-sm font-bold text-white`}
                >
                  {q.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-900">
                    {q.name}
                  </p>
                  <p className="text-xs text-muted">{q.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
