import { cn } from "@/lib/utils";

type BadgeProps = {
  verified: boolean;
  label: string;
};

/** A single trust badge: green when verified, muted when not. */
function Badge({ verified, label }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        verified
          ? "bg-brand-100 text-brand-700"
          : "bg-slate-100 text-muted",
      )}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {verified ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <circle cx="12" cy="12" r="9" />
        )}
      </svg>
      {label} {verified ? "verified" : "unverified"}
    </span>
  );
}

/** Email + phone trust indicators, shown on profiles and the dashboard. */
export function VerificationBadges({
  emailVerified,
  phoneVerified,
  className,
}: {
  emailVerified: boolean;
  phoneVerified: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Badge verified={emailVerified} label="Email" />
      <Badge verified={phoneVerified} label="Phone" />
    </div>
  );
}
