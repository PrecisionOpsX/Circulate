import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { StockImage } from "@/components/ui/StockImage";
import { stockImage, STOCK } from "@/lib/images";

const CATEGORIES = [
  { label: "Electronics", note: "Phones, laptops, gear", img: STOCK.electronics },
  { label: "Home & Garden", note: "Plants, decor, tools", img: STOCK.homeGarden },
  { label: "Clothing", note: "Everyday and vintage", img: STOCK.clothing },
  { label: "Fresh & Local", note: "Homegrown and handmade", img: STOCK.fresh },
  { label: "Services", note: "Skills, lessons, help", img: STOCK.services },
  { label: "Anything else", note: "If it has value, trade it", img: STOCK.trade },
];

export function Categories() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-circ-green">
              Explore
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
              Trade across every category
            </h2>
          </div>
          <Link
            href="/browse"
            className="text-sm font-semibold text-circ-blue hover:text-circ-blue-dark"
          >
            Browse all listings &rarr;
          </Link>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat.label} delay={i * 70}>
              <Link
                href="/browse"
                className="group relative block aspect-[16/10] overflow-hidden rounded-2xl border border-border"
              >
                <StockImage
                  src={stockImage(cat.img, 700)}
                  alt={cat.label}
                  fill
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-lg font-bold text-white">{cat.label}</h3>
                  <p className="text-sm text-white/75">{cat.note}</p>
                </div>
                <span className="absolute right-4 top-4 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-surface/90 text-brand-800 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
