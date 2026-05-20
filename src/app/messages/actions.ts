"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "@/lib/validation";

export type MessageState = {
  ok: boolean;
  error?: string;
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
 * Bumps the sender's last_read_at so their own message never registers
 * as "unread" for them.
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

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };

  const now = new Date().toISOString();
  const isBuyer = conv.buyer_id === user.id;
  await supabase
    .from("conversations")
    .update(
      isBuyer ? { last_read_buyer_at: now } : { last_read_seller_at: now },
    )
    .eq("id", conversationId);

  return { ok: true };
}

/**
 * Mark a conversation as read for the signed-in user. Called from the
 * client when they open or focus a conversation.
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

  const { data: conv } = await supabase
    .from("conversations")
    .select("buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return;
  if (conv.buyer_id !== user.id && conv.seller_id !== user.id) return;

  const now = new Date().toISOString();
  const isBuyer = conv.buyer_id === user.id;
  await supabase
    .from("conversations")
    .update(
      isBuyer ? { last_read_buyer_at: now } : { last_read_seller_at: now },
    )
    .eq("id", conversationId);
}
