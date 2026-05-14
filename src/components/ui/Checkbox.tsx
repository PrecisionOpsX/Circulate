import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

export function Checkbox({ id, label, className, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-foreground">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 rounded border-border text-brand-600 accent-brand-600",
          className,
        )}
        {...props}
      />
      <span className="leading-5">{label}</span>
    </label>
  );
}
