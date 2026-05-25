"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AD_SLOTS } from "@/lib/ad-slots";

const VALID_SLOTS = AD_SLOTS.map((s) => s.value);

async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  return { supabase };
}

function revalidateAll() {
  revalidatePath("/admin/ads");
  revalidatePath("/", "layout");
}

type ManifestEntry =
  | { type: "url"; url: string }
  | { type: "file"; index: number };

async function uploadAdImage(
  file: File,
  supabase: Awaited<ReturnType<typeof requireAdminClient>>["supabase"],
): Promise<string | null> {
  const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const path = `${crypto.randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { data: uploaded, error: uploadErr } = await supabase.storage
    .from("ad-images")
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadErr || !uploaded) {
    console.error("[resolveImageUrls] upload error:", uploadErr?.message);
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("ad-images").getPublicUrl(uploaded.path);

  return publicUrl;
}

/**
 * Resolves banner image URLs from FormData in showcase order.
 * Supports mixed URL + upload entries via imagesManifest JSON.
 */
async function resolveImageUrls(
  formData: FormData,
  supabase: Awaited<ReturnType<typeof requireAdminClient>>["supabase"],
): Promise<string[]> {
  const manifestRaw = String(formData.get("imagesManifest") ?? "").trim();
  const files = formData
    .getAll("imageFile")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (manifestRaw) {
    let manifest: ManifestEntry[] = [];
    try {
      manifest = JSON.parse(manifestRaw) as ManifestEntry[];
    } catch {
      return [];
    }

    const urls: string[] = [];
    for (const entry of manifest) {
      if (entry.type === "url") {
        const url = entry.url.trim();
        if (url) urls.push(url);
      } else if (entry.type === "file") {
        const file = files[entry.index];
        if (!file) continue;
        const uploaded = await uploadAdImage(file, supabase);
        if (uploaded) urls.push(uploaded);
      }
    }
    return urls;
  }

  // Legacy: files only or single URL field.
  if (files.length > 0) {
    const urls: string[] = [];
    for (const file of files) {
      const uploaded = await uploadAdImage(file, supabase);
      if (uploaded) urls.push(uploaded);
    }
    return urls;
  }

  const url = String(formData.get("imageUrl") ?? "").trim();
  return url ? [url] : [];
}

/** Create a new ad. */
export async function createAdAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminClient();

  const slot      = String(formData.get("slot")      ?? "").trim();
  const linkUrl   = String(formData.get("linkUrl")   ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim() || null;
  const endDate   = String(formData.get("endDate")   ?? "").trim() || null;
  const isEnabled = formData.get("isEnabled") === "on";

  if (!slot || !VALID_SLOTS.includes(slot as never) || !linkUrl) {
    redirect("/admin/ads?error=invalid");
  }

  const imageUrls = await resolveImageUrls(formData, supabase);
  if (imageUrls.length === 0) {
    redirect("/admin/ads?error=upload_failed");
  }

  const { error } = await supabase.from("ads").insert({
    slot,
    image_url:   imageUrls[0],    // primary image for backward compat
    image_urls:  imageUrls,       // full list for carousel
    link_url:    linkUrl,
    start_date:  startDate,
    end_date:    endDate,
    is_enabled:  isEnabled,
  });

  if (error) {
    console.error("[createAdAction]", error.message);
    redirect("/admin/ads?error=failed");
  }

  revalidateAll();
  redirect("/admin/ads?created=1");
}

/** Flip is_enabled for an existing ad. */
export async function toggleAdAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminClient();

  const adId      = String(formData.get("adId")      ?? "").trim();
  const isEnabled = formData.get("isEnabled") === "true";
  if (!adId) redirect("/admin/ads?error=invalid");

  const { error } = await supabase
    .from("ads")
    .update({ is_enabled: !isEnabled })
    .eq("id", adId);

  if (error) {
    console.error("[toggleAdAction]", error.message);
    redirect("/admin/ads?error=failed");
  }

  revalidateAll();
  redirect("/admin/ads");
}

/** Permanently delete an ad. */
export async function deleteAdAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminClient();

  const adId = String(formData.get("adId") ?? "").trim();
  if (!adId) redirect("/admin/ads?error=invalid");

  const { error } = await supabase.from("ads").delete().eq("id", adId);

  if (error) {
    console.error("[deleteAdAction]", error.message);
    redirect("/admin/ads?error=failed");
  }

  revalidateAll();
  redirect("/admin/ads?deleted=1");
}
