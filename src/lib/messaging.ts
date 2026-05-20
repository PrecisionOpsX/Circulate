import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Conversation,
  ListingStatus,
  ListingType,
  Message,
} from "@/lib/supabase/types";

export type ChatParty = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type ChatListing = {
  id: string;
  title: string;
  status: ListingStatus;
  price: number;
  type: ListingType;
  listing_photos: Array<{ url: string; sort_order: number }>;
};

export type ConversationWithRelations = Conversation & {
  listing: ChatListing | null;
  buyer: ChatParty | null;
  seller: ChatParty | null;
};

export type ConversationListItem = ConversationWithRelations & {
  unread: boolean;
};

const CONVERSATION_SELECT =
  "*, " +
  "listing:listings(id, title, status, price, type, listing_photos(url, sort_order)), " +
  "buyer:profiles!buyer_id(id, display_name, avatar_url), " +
  "seller:profiles!seller_id(id, display_name, avatar_url)";

/** All conversations the user participates in, newest activity first. */
export async function getMyConversations(
  userId: string,
): Promise<ConversationListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<ConversationWithRelations[]>();

  return (data ?? []).map((c) => ({ ...c, unread: isUnreadFor(c, userId) }));
}

/** Number of the user's conversations that have unseen new messages. */
export async function getMyUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "buyer_id, seller_id, last_message_at, last_read_buyer_at, last_read_seller_at",
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

  return (data ?? []).reduce(
    (count, c) => count + (isUnreadFor(c, userId) ? 1 : 0),
    0,
  );
}

/** Fetch one conversation with its relations; returns null if the user isn't a participant. */
export async function getConversationDetail(
  conversationId: string,
  userId: string,
): Promise<ConversationWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", conversationId)
    .maybeSingle()
    .returns<ConversationWithRelations>();

  if (!data) return null;
  if (data.buyer_id !== userId && data.seller_id !== userId) return null;
  return data;
}

/** All messages in a conversation, oldest first. */
export async function getMessages(
  conversationId: string,
): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** From a conversation, return the non-me party. */
export function otherPartyOf(
  conversation: ConversationWithRelations,
  myUserId: string,
): ChatParty | null {
  if (conversation.buyer_id === myUserId) return conversation.seller;
  if (conversation.seller_id === myUserId) return conversation.buyer;
  return null;
}

/**
 * Unread heuristic: a conversation is unread for me if there's a last
 * message stamped later than the timestamp at which I last read this
 * conversation. Sending a message also bumps my own read timestamp (handled
 * in the sendMessage action), so my own messages never show as unread.
 */
function isUnreadFor(
  c: Pick<
    Conversation,
    | "buyer_id"
    | "seller_id"
    | "last_message_at"
    | "last_read_buyer_at"
    | "last_read_seller_at"
  >,
  userId: string,
): boolean {
  if (!c.last_message_at) return false;
  const lastRead =
    c.buyer_id === userId ? c.last_read_buyer_at : c.last_read_seller_at;
  if (!lastRead) return true;
  return c.last_message_at > lastRead;
}
