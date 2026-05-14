import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Logo } from "@/components/layout/Logo";

const FOOTER_LINKS = [
  {
    heading: "Marketplace",
    links: [
      { href: "/browse", label: "Browse listings" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/signup", label: "Get started" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto bg-brand-900 text-white">
      {/* circulation accent line */}
      <div className="h-1 w-full bg-[linear-gradient(100deg,var(--color-circ-green),var(--color-circ-blue))]" />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-3">
          <Logo tone="light" />
          <p className="max-w-xs text-sm text-brand-200">{APP_TAGLINE}</p>
        </div>
        {FOOTER_LINKS.map((col) => (
          <div key={col.heading}>
            <h3 className="text-sm font-semibold text-white">{col.heading}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-200 transition-colors hover:text-gold-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-brand-300">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
