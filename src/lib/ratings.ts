import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RatingRow = {
  id: string;
  stars: number;
  review: string | null;
  created_at: string;
  rater: { id: string; display_name: string; avatar_url: string | null } | null;
};

/** Ratings other users have left for a given user, newest first. */
export async function getRatingsForUser(
  userId: string,
): Promise<RatingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ratings")
    .select(
      "id, stars, review, created_at, rater:profiles!rater_id(id, display_name, avatar_url)",
    )
    .eq("ratee_id", userId)
    .order("created_at", { ascending: false })
    .returns<RatingRow[]>();
  return data ?? [];
}

export type PendingRating = {
  transactionId: string;
  listingId: string | null;
  listingTitle: string | null;
  otherParty: { id: string; display_name: string } | null;
  role: "buyer" | "seller";
  completedAt: string;
};

type PendingTxnRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  completed_at: string | null;
  listing: { id: string; title: string } | null;
  buyer: { id: string; display_name: string } | null;
  seller: { id: string; display_name: string } | null;
};

/**
 * Completed transactions in which the user is a party and has not yet
 * left their rating. Powers the dashboard "Rate your trade" prompts.
 */
export async function getPendingRatings(
  userId: string,
): Promise<PendingRating[]> {
  const supabase = await createClient();
  const { data: txns } = await supabase
    .from("transactions")
    .select(
      "id, listing_id, buyer_id, seller_id, completed_at, " +
        "listing:listings(id, title), " +
        "buyer:profiles!buyer_id(id, display_name), " +
        "seller:profiles!seller_id(id, display_name)",
    )
    .eq("status", "completed")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("completed_at", { ascending: false })
    .returns<PendingTxnRow[]>();

  if (!txns || txns.length === 0) return [];

  const txnIds = txns.map((t) => t.id);
  const { data: myRatings } = await supabase
    .from("ratings")
    .select("transaction_id")
    .eq("rater_id", userId)
    .in("transaction_id", txnIds);

  const rated = new Set((myRatings ?? []).map((r) => r.transaction_id));

  return txns
    .filter((t) => !rated.has(t.id))
    .map<PendingRating>((t) => {
      const isBuyer = t.buyer_id === userId;
      return {
        transactionId: t.id,
        listingId: t.listing_id,
        listingTitle: t.listing?.title ?? null,
        otherParty: isBuyer ? t.seller : t.buyer,
        role: isBuyer ? "buyer" : "seller",
        completedAt: t.completed_at ?? "",
      };
    });
}

/** Whether the signed-in user has blocked a given target. */
export async function isUserBlocked(
  blockerId: string,
  targetId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", targetId)
    .maybeSingle();
  return Boolean(data);
}
