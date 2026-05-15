import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

/** Styled <textarea>, consistent with the Input primitive. */
export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted",
        "disabled:cursor-not-allowed disabled:opacity-60",
        invalid ? "border-danger" : "border-border",
        className,
      )}
      {...props}
    />
  );
}
