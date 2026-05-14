import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "info" | "success" | "warning" | "error";

const styles: Record<Variant, string> = {
  info: "bg-brand-50 text-brand-800 border-brand-200",
  success: "bg-success-bg text-brand-800 border-brand-200",
  warning: "bg-warning-bg text-amber-800 border-amber-200",
  error: "bg-danger-bg text-red-800 border-red-200",
};

export function Alert({
  variant = "info",
  children,
  className,
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        styles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
