import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { StockImage } from "@/components/ui/StockImage";
import { stockImage, STOCK } from "@/lib/images";

const LISTINGS = [
  {
    title: "Mid-century desk lamp",
    category: "Home & Garden",
    price: 25,
    img: STOCK.homeGarden,
    type: "Goods",
  },
  {
    title: "Guitar lessons, one hour",
    category: "Services",
    price: 18,
    img: STOCK.services,
    type: "Service",
  },
  {
    title: "Refurbished laptop",
    category: "Electronics",
    price: 140,
    img: STOCK.electronics,
    type: "Goods",
  },
  {
    title: "Vintage denim jacket",
    category: "Clothing",
    price: 32,
    img: STOCK.clothing,
    type: "Goods",
  },
];

/** Mock listing grid so the marketplace feels alive pre-launch. */
export function Showcase() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-circ-blue">
          The marketplace
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
          See what is circulating
        </h2>
        <p className="mt-3 text-muted">
          A peek at the kinds of trades happening across the community.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {LISTINGS.map((item, i) => (
          <Reveal key={item.title} delay={i * 90}>
            <Link
              href="/browse"
              className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <StockImage
                  src={stockImage(item.img, 600)}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 280px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-brand-700 backdrop-blur">
                  {item.type}
                </span>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted">{item.category}</p>
                <h3 className="mt-0.5 font-semibold text-brand-900">
                  {item.title}
                </h3>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-circ-green">
                    {item.price} credits
                  </span>
                  <span className="text-xs font-medium text-circ-blue opacity-0 transition-opacity group-hover:opacity-100">
                    View &rarr;
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
