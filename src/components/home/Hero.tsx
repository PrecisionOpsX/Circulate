import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StockImage } from "@/components/ui/StockImage";
import { stockImage, STOCK } from "@/lib/images";
import { getPlatformSettings } from "@/lib/platform-settings";
import { formatCredits } from "@/lib/utils";

/** Landing hero: headline + CTAs on the left, layered image collage right. */
export async function Hero() {
  const { signupCreditGrant } = await getPlatformSettings();
  return (
    <section className="relative overflow-hidden">
      {/* soft background wash + animated colour blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_0%,rgba(43,127,255,0.10),transparent),radial-gradient(50%_50%_at_0%_30%,rgba(63,165,53,0.10),transparent)]" />
        <div className="animate-float-slow absolute -left-24 top-20 h-72 w-72 rounded-full bg-circ-green/20 blur-3xl" />
        <div className="animate-float absolute -right-16 top-0 h-72 w-72 rounded-full bg-circ-blue/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
        {/* ---- copy ---- */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-circ-green" />
            The cashless local marketplace
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-brand-900 sm:text-5xl lg:text-6xl">
            Trade anything.
            <br />
            <span className="text-gradient">Spend no cash.</span>
          </h1>

          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Circulate is where neighbours swap goods and services using shared
            community credits. Earn when you sell, spend when you buy. It is
            that simple.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="gradient">
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/browse">Browse the marketplace</Link>
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {["bg-circ-green", "bg-circ-blue", "bg-gold-400", "bg-brand-500"].map(
                (c, i) => (
                  <span
                    key={i}
                    className={`h-8 w-8 rounded-full border-2 border-surface ${c}`}
                  />
                ),
              )}
            </div>
            <p className="text-sm text-muted">
              Sign up and get{" "}
              <span className="font-semibold text-brand-800">
                {formatCredits(signupCreditGrant)} credits
              </span>{" "}
              to start trading.
            </p>
          </div>
        </div>

        {/* ---- image collage ---- */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          {/* rotating accent ring */}
          <div className="animate-spin-slow absolute -inset-6 -z-10 rounded-[2.5rem] bg-[conic-gradient(from_0deg,rgba(63,165,53,0.18),rgba(43,127,255,0.18),rgba(240,180,41,0.18),rgba(63,165,53,0.18))] blur-2xl" />

          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-lift)]">
            <StockImage
              src={stockImage(STOCK.heroFlatlay, 1000)}
              alt="A flat-lay of clothing and accessories ready to trade"
              fill
              sizes="(max-width: 1024px) 90vw, 480px"
              className="object-cover"
              priority
            />
          </div>

          {/* floating: credits earned */}
          <div className="animate-float absolute -left-4 top-10 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-[var(--shadow-lift)] backdrop-blur sm:-left-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-600">
              <CoinIcon />
            </span>
            <div>
              <p className="text-xs text-muted">Credits earned</p>
              <p className="text-sm font-bold text-brand-900">+ 23.50</p>
            </div>
          </div>

          {/* floating: verified badge */}
          <div className="animate-float-slow absolute -right-3 top-1/3 flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3.5 py-2 shadow-[var(--shadow-lift)] backdrop-blur sm:-right-6">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-circ-blue text-white">
              <CheckIcon />
            </span>
            <span className="text-xs font-semibold text-brand-800">
              Verified seller
            </span>
          </div>

          {/* floating: mini listing */}
          <div className="animate-float absolute -bottom-6 right-2 w-48 rounded-2xl border border-border bg-surface/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur sm:right-0">
            <div className="relative h-20 w-full overflow-hidden rounded-xl">
              <StockImage
                src={stockImage(STOCK.homeGarden, 400)}
                alt=""
                fill
                sizes="192px"
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-brand-900">
              Monstera plant
            </p>
            <p className="text-xs text-muted">Home &amp; Garden</p>
            <p className="mt-1 text-sm font-bold text-circ-green">12 credits</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3H9m0 0h5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
