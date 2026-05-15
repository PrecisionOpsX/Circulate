import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "neutral" | "brand" | "green" | "blue" | "gold" | "danger";

const variants: Record<Variant, string> = {
  neutral: "bg-slate-100 text-slate-600",
  brand: "bg-brand-50 text-brand-700",
  green: "bg-brand-100 text-circ-green-dark",
  blue: "bg-blue-50 text-circ-blue-dark",
  gold: "bg-gold-100 text-gold-700",
  danger: "bg-danger-bg text-red-700",
};

/** Small inline status / category label. */
export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
