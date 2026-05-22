"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "@/lib/validation";
import type { Message } from "@/lib/supabase/types";

export type MessageState = {
  ok: boolean;
  error?: string;
  /** The freshly-inserted row, returned so the client can swap its
   *  optimistic entry for the real one (matching ids dedupe the
   *  realtime echo). */
  message?: Message;
};

/**
 * Look up the existing buyer<->seller conversation for a listing, or
 * create one, then redirect into it. Called from a "Message seller"
 * form on the listing detail page.
 */
export async function getOrCreateConversationAction(
  formData: FormData,
): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) redirect("/browse");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/listings/${listingId}`);

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) redirect("/browse");
  if (listing.seller_id === user.id) redirect(`/listings/${listingId}`);

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("seller_id", listing.seller_id)
    .maybeSingle();
  if (existing) redirect(`/messages/${existing.id}`);

  const { data: created } = await supabase
    .from("conversations")
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
    })
    .select("id")
    .single();
  if (!created) redirect(`/listings/${listingId}`);

  revalidatePath("/messages");
  redirect(`/messages/${created.id}`);
}

/**
 * Append a message to a conversation. The Realtime publication on
 * `messages` notifies all participants subscribed to the channel.
 * Bumps last_message_at for ordering; unread tracking is handled by
 * the messages.viewed column, not by conversation timestamps.
 */
export async function sendMessageAction(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to send messages." };

  const conversationId = String(formData.get("conversationId") ?? "");
  if (!conversationId) return { ok: false, error: "Missing conversation." };

  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return { ok: false, error: "Conversation not found." };
  if (conv.buyer_id !== user.id && conv.seller_id !== user.id) {
    return { ok: false, error: "You are not part of this conversation." };
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: parsed.data.body,
    })
    .select("*")
    .single();
  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Could not send message." };
  }

  // Bump last_message_at so the conversations list stays sorted correctly.
  // Outbound messages default to viewed=false but that is fine: unread
  // detection filters by sender_id != userId, so your own messages never
  // count as unread for you.
  await supabase
    .from("conversations")
    .update({ last_message_at: inserted.created_at })
    .eq("id", conversationId);

  return { ok: true, message: inserted };
}

/**
 * Mark all unread messages in a conversation as viewed for the signed-in
 * user. Called from the client when they open a conversation thread.
 *
 * The RLS policy on messages only allows the non-sender to flip
 * viewed=true, so this update is safe to run without a participant check
 * on the conversations table -- the policy enforces it at the DB level.
 */
export async function markConversationReadAction(
  conversationId: string,
): Promise<void> {
  if (!conversationId) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Flip every unread message in this conversation that was sent by
  // the other party. The RLS WITH CHECK ensures viewed can only go
  // false -> true, never the reverse.
  await supabase
    .from("messages")
    .update({ viewed: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .eq("viewed", false);
}
