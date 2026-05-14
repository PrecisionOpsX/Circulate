import { Reveal } from "@/components/ui/Reveal";

const ITEMS = [
  {
    title: "No cash needed",
    body: "Trade entirely in community credits.",
    icon: (
      <path d="M3 10h18M7 15h4m-8 3h18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1Z" />
    ),
  },
  {
    title: "Verified members",
    body: "Email and phone checks build real trust.",
    icon: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4" />
    ),
  },
  {
    title: "Fair by design",
    body: "A small 6% fee keeps the system healthy.",
    icon: <path d="M12 3v18M6 7l12 10M18 7 6 17" />,
  },
  {
    title: "Local first",
    body: "Discover what neighbours are trading nearby.",
    icon: (
      <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    ),
  },
];

/** Thin band of headline value props directly under the hero. */
export function ValueStrip() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-px overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item, i) => (
          <Reveal
            key={item.title}
            delay={i * 80}
            className="flex items-start gap-3 bg-surface px-5 py-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-900">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
