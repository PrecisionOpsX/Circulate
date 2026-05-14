import type { ReactNode } from "react";

/** Shared container for signed-in app pages. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-10">
      {children}
    </div>
  );
}
