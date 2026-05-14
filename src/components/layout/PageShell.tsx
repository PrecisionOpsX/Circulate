import type { ReactNode } from "react";

/** Standard centered content column for marketing / static pages. */
export function PageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}
