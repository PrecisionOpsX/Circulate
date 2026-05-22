import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ListingStatus,
  ListingType,
  Message,
  Conversation,
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
  latestMessage: Pick<Message, "body" | "sender_id" | "created_at"> | null;
};

const CONVERSATION_SELECT =
  "*, " +
  "listing:listings(id, title, status, price, type, listing_photos(url, sort_order)), " +
  "buyer:profiles!buyer_id(id, display_name, avatar_url), " +
  "seller:profiles!seller_id(id, display_name, avatar_url)";

/**
 * Number of the user's conversations that contain at least one unread
 * message. Uses the messages.viewed column so the result is always
 * correct on a hard refresh -- no dependency on conversation timestamps.
 */
export async function getMyUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("conversation_id")
    .eq("viewed", false)
    .neq("sender_id", userId);

  // Count distinct conversations with at least one unread message.
  return new Set((data ?? []).map((m) => m.conversation_id)).size;
}

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

  const convs = data ?? [];
  if (convs.length === 0) return [];

  // Fetch all messages for these conversations in one query.
  // - viewed + sender_id together let us derive the unread flag.
  // - ordering DESC means the first row per conversation is the newest.
  const convIds = convs.map((c) => c.id);
  const { data: msgs } = await supabase
    .from("messages")
    .select("conversation_id, body, sender_id, created_at, viewed")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  const latestByConv = new Map<
    string,
    Pick<Message, "body" | "sender_id" | "created_at">
  >();
  const unreadConvIds = new Set<string>();

  for (const m of msgs ?? []) {
    // First occurrence per conversation = newest message (list preview).
    if (!latestByConv.has(m.conversation_id)) {
      latestByConv.set(m.conversation_id, {
        body: m.body,
        sender_id: m.sender_id,
        created_at: m.created_at,
      });
    }
    // Any unviewed message from the other party means the conversation is unread.
    if (!m.viewed && m.sender_id !== userId) {
      unreadConvIds.add(m.conversation_id);
    }
  }

  return convs.map((c) => ({
    ...c,
    unread: unreadConvIds.has(c.id),
    latestMessage: latestByConv.get(c.id) ?? null,
  }));
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

export type ListingConversationPreview = ConversationWithRelations & {
  latestMessage: Pick<Message, "body" | "sender_id" | "created_at"> | null;
  unread: boolean;
};

/**
 * Conversations on a specific listing that involve the given user.
 *
 * If `isOwner` is true, returns every conversation buyers have started
 * on this listing. Otherwise returns just the user's own conversation
 * with the seller (zero or one row), since (listing, buyer, seller) is
 * a unique key.
 *
 * Each entry carries its latest message so the caller can render a
 * preview without N+1 queries.
 */
export async function getListingConversationsForUser(
  listingId: string,
  userId: string,
  isOwner: boolean,
): Promise<ListingConversationPreview[]> {
  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("listing_id", listingId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  query = isOwner
    ? query.eq("seller_id", userId)
    : query.eq("buyer_id", userId);

  const { data: convs } = await query.returns<ConversationWithRelations[]>();
  if (!convs || convs.length === 0) return [];

  const convIds = convs.map((c) => c.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, body, sender_id, created_at, viewed")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  const latestByConv = new Map<
    string,
    Pick<Message, "body" | "sender_id" | "created_at">
  >();
  const unreadConvIds = new Set<string>();

  for (const m of messages ?? []) {
    if (!latestByConv.has(m.conversation_id)) {
      latestByConv.set(m.conversation_id, {
        body: m.body,
        sender_id: m.sender_id,
        created_at: m.created_at,
      });
    }
    if (!m.viewed && m.sender_id !== userId) {
      unreadConvIds.add(m.conversation_id);
    }
  }

  return convs.map((c) => ({
    ...c,
    latestMessage: latestByConv.get(c.id) ?? null,
    unread: unreadConvIds.has(c.id),
  }));
}
