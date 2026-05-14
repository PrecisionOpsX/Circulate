import type { ReactNode } from "react";

type FieldProps = {
  /** Must match the `id` of the control it wraps. */
  htmlFor: string;
  label: string;
  /** Field-level validation error, if any. */
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
};

/** Label + control + hint/error, with accessible wiring. */
export function Field({
  htmlFor,
  label,
  error,
  hint,
  required,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
