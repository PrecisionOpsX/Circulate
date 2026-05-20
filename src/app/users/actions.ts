"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BlockResult = {
  ok: boolean;
  /** New blocked state for the target after the toggle. */
  blocked?: boolean;
  error?: string;
};

/**
 * Toggle whether the signed-in user has blocked another user.
 * Returns the resulting state so the client button can stay in sync.
 */
export async function toggleBlockAction(
  targetUserId: string,
): Promise<BlockResult> {
  if (!targetUserId) return { ok: false, error: "Missing target." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to block." };
  if (user.id === targetUserId) {
    return { ok: false, error: "You can't block yourself." };
  }

  const { data: existing } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/users/${targetUserId}`);
    return { ok: true, blocked: false };
  }

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id: targetUserId });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/users/${targetUserId}`);
  return { ok: true, blocked: true };
}
