import { Badge } from "@/components/ui/Badge";
import type { ListingStatus } from "@/lib/supabase/types";

const STATUS_MAP: Record<
  ListingStatus,
  { label: string; variant: "green" | "neutral" | "danger" | "gold" }
> = {
  active: { label: "Active", variant: "green" },
  sold: { label: "Sold", variant: "neutral" },
  removed: { label: "Removed", variant: "danger" },
  draft: { label: "Draft", variant: "gold" },
};

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  const { label, variant } = STATUS_MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}
