"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";
import { AVATAR_BUCKET } from "@/lib/constants";

export type ProfileFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

/** Update the signed-in user's profile basics (name, bio, avatar). */
export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
    avatarPath: formData.get("avatarPath") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { displayName, bio, avatarUrl, avatarPath } = parsed.data;

  // Grab the previous avatar path so we can purge the orphaned object
  // from Storage after the row is updated.
  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();
  const previousPath = current?.avatar_path ?? null;

  // RLS ("profiles: update own") restricts this to the caller's own row.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      avatar_path: avatarPath || null,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  // Clean up the prior avatar from Storage if it has been replaced or
  // removed. Storage RLS lets the user delete only their own folder.
  const newPath = avatarPath || null;
  if (previousPath && previousPath !== newPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile updated." };
}
