import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

/** Closing call-to-action band. */
export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <Reveal className="relative overflow-hidden rounded-3xl bg-[linear-gradient(110deg,var(--color-circ-green),var(--color-circ-blue))] px-6 py-14 text-center sm:px-12 sm:py-20">
        {/* soft texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_60%_at_20%_0%,rgba(255,255,255,0.25),transparent),radial-gradient(40%_60%_at_90%_100%,rgba(11,31,58,0.3),transparent)]" />

        <div className="relative">
          <h2 className="mx-auto max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to trade your way?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">
            Join Circulate, list your first item, and start earning community
            credits today. It is free to get started.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="gold">
              <Link href="/signup">Create your free account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-transparent bg-white/15 text-white backdrop-blur hover:bg-white/25"
            >
              <Link href="/how-it-works">Learn how it works</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
