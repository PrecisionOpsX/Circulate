import { Badge } from "@/components/ui/Badge";
import { VerificationBadges } from "@/components/account/VerificationBadges";

type Props = {
  emailVerified: boolean;
  phoneVerified: boolean;
  completedTrades: number;
  ratingAvg: number;
  ratingCount: number;
};

/**
 * Aggregate trust signals for a profile: email + phone verification,
 * activity-based badges (frequent trader), and a top-rated badge once
 * the user has accumulated enough positive ratings.
 */
export function TrustBadges({
  emailVerified,
  phoneVerified,
  completedTrades,
  ratingAvg,
  ratingCount,
}: Props) {
  const frequentTrader = completedTrades >= 10;
  const topRated = ratingCount >= 3 && ratingAvg >= 4.5;

  return (
    <div className="flex flex-wrap gap-2">
      <VerificationBadges
        emailVerified={emailVerified}
        phoneVerified={phoneVerified}
      />
      {topRated && (
        <Badge variant="gold">
          <StarIcon /> Top rated
        </Badge>
      )}
      {frequentTrader && (
        <Badge variant="brand">
          <SparkIcon /> Frequent trader
        </Badge>
      )}
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
