import { Hero } from "@/components/home/Hero";
import { ValueStrip } from "@/components/home/ValueStrip";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Categories } from "@/components/home/Categories";
import { CreditModel } from "@/components/home/CreditModel";
import { Showcase } from "@/components/home/Showcase";
import { Testimonials } from "@/components/home/Testimonials";
import { FinalCta } from "@/components/home/FinalCta";

export default function HomePage() {
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
