import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_PX: Record<Size, number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

/**
 * Read-only star display. Renders 5 stars, filled to the rounded value.
 * Pass `precise` to show a half-star treatment for the partial value.
 */
export function RatingStars({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: Size;
  className?: string;
}) {
  const px = SIZE_PX[size];
  const safe = Math.max(0, Math.min(5, value));

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${safe.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, safe - (n - 1)));
        return <Star key={n} size={px} fill={fill} />;
      })}
    </div>
  );
}

function Star({ size, fill }: { size: number; fill: number }) {
  // fill is 0..1 for this star. We mask the gold star with a clip-path
  // so partial fills (e.g. 0.6) render correctly.
  const pct = Math.round(fill * 100);
  return (
    <span
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      <Outline size={size} className="absolute inset-0 text-slate-300" />
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pct}%` }}
        aria-hidden
      >
        <Outline size={size} className="text-gold-400" filled />
      </span>
    </span>
  );
}

function Outline({
  size,
  className,
  filled,
}: {
  size: number;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
    </svg>
  );
}
