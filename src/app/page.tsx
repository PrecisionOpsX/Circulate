import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Hero } from "@/components/home/Hero";
import { ValueStrip } from "@/components/home/ValueStrip";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Categories } from "@/components/home/Categories";
import { CreditModel } from "@/components/home/CreditModel";
import { Showcase } from "@/components/home/Showcase";
import { Testimonials } from "@/components/home/Testimonials";
import { FinalCta } from "@/components/home/FinalCta";

export default async function HomePage() {
  // Signed-in visitors go straight to their dashboard so reopening the
  // app drops them back where they left off, not on the marketing splash.
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <>
      <Hero />
      <ValueStrip />
      <HowItWorks />
      <Categories />
      <CreditModel />
      <Showcase />
      <Testimonials />
      <FinalCta />
    </>
  );
}
