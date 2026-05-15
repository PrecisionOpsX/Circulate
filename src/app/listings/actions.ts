"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listingSchema, listingPhotoSchema } from "@/lib/validation";
import { LISTING_LIMITS, LISTING_PHOTOS_BUCKET } from "@/lib/constants";
import type { ListingStatus } from "@/lib/supabase/types";

/** Standard return shape for listing form actions (useActionState). */
export type ListingFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Parse the `photos` form entries (each a JSON-encoded {url, path}). */
function parsePhotos(formData: FormData) {
  const raw = formData.getAll("photos");
  const photos = raw
    .map((entry) => {
      if (typeof entry !== "string") return null;
      try {
        return listingPhotoSchema.parse(JSON.parse(entry));
      } catch {
        return null;
      }
    })
    .filter((p): p is { url: string; path: string } => p !== null);
  return photos.slice(0, LISTING_LIMITS.MAX_PHOTOS);
}

// ============================================================
// Create a listing.
// ============================================================
export async function createListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parsed = listingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    categoryId: formData.get("categoryId"),
    locationId: formData.get("locationId"),
    conditionId: formData.get("conditionId") ?? "",
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const photos = parsePhotos(formData);
  const { title, description, type, categoryId, locationId, conditionId, price } =
    parsed.data;

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      title,
      description,
      type,
      category_id: categoryId,
      location_id: locationId,
      condition_id: conditionId || null,
      price,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !listing) {
    return { ok: false, error: error?.message ?? "Could not create listing." };
  }

  if (photos.length > 0) {
    const { error: photoError } = await supabase.from("listing_photos").insert(
      photos.map((p, i) => ({
        listing_id: listing.id,
        url: p.url,
        storage_path: p.path,
        sort_order: i,
      })),
    );
    if (photoError) {
      return { ok: false, error: `Listing saved, but photos failed: ${photoError.message}` };
    }
  }

  revalidatePath("/browse");
  revalidatePath("/listings/mine");
  redirect(`/listings/${listing.id}`);
}

// ============================================================
// Update an existing listing (owner only, enforced by RLS + check).
// ============================================================
export async function updateListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return { ok: false, error: "Missing listing reference." };

  const parsed = listingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    categoryId: formData.get("categoryId"),
    locationId: formData.get("locationId"),
    conditionId: formData.get("conditionId") ?? "",
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  // Confirm ownership before touching anything.
  const { data: existing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .single();
  if (!existing || existing.seller_id !== user.id) {
    return { ok: false, error: "You can only edit your own listings." };
  }

  const photos = parsePhotos(formData);
  const { title, description, type, categoryId, locationId, conditionId, price } =
    parsed.data;

  const { error: updateError } = await supabase
    .from("listings")
    .update({
      title,
      description,
      type,
      category_id: categoryId,
      location_id: locationId,
      condition_id: conditionId || null,
      price,
    })
    .eq("id", listingId);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // Reconcile photos: anything previously attached but no longer submitted
  // gets removed from Storage; the listing_photos rows are rewritten.
  const { data: currentPhotos } = await supabase
    .from("listing_photos")
    .select("storage_path")
    .eq("listing_id", listingId);

  const submittedPaths = new Set(photos.map((p) => p.path));
  const orphanedPaths = (currentPhotos ?? [])
    .map((p) => p.storage_path)
    .filter((path): path is string => Boolean(path) && !submittedPaths.has(path!));

  if (orphanedPaths.length > 0) {
    await supabase.storage.from(LISTING_PHOTOS_BUCKET).remove(orphanedPaths);
  }

  await supabase.from("listing_photos").delete().eq("listing_id", listingId);
  if (photos.length > 0) {
    await supabase.from("listing_photos").insert(
      photos.map((p, i) => ({
        listing_id: listingId,
        url: p.url,
        storage_path: p.path,
        sort_order: i,
      })),
    );
  }

  revalidatePath("/browse");
  revalidatePath("/listings/mine");
  revalidatePath(`/listings/${listingId}`);
  redirect(`/listings/${listingId}`);
}

// ============================================================
// Delete a listing (owner only). Also clears its Storage objects.
// ============================================================
export async function deleteListingAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) redirect("/listings/mine");

  const { data: existing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .single();
  if (!existing || existing.seller_id !== user.id) {
    redirect("/listings/mine");
  }

  const { data: photos } = await supabase
    .from("listing_photos")
    .select("storage_path")
    .eq("listing_id", listingId);

  const paths = (photos ?? [])
    .map((p) => p.storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    await supabase.storage.from(LISTING_PHOTOS_BUCKET).remove(paths);
  }

  // listing_photos cascade-delete with the listing.
  await supabase.from("listings").delete().eq("id", listingId);

  revalidatePath("/browse");
  revalidatePath("/listings/mine");
  redirect("/listings/mine");
}

// ============================================================
// Change a listing's status (owner only): active <-> sold, or remove.
// ============================================================
const STATUS_VALUES: ListingStatus[] = ["active", "sold", "removed"];

export async function updateListingStatusAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listingId = String(formData.get("listingId") ?? "");
  const status = String(formData.get("status") ?? "") as ListingStatus;
  if (!listingId || !STATUS_VALUES.includes(status)) {
    redirect("/listings/mine");
  }

  const { data: existing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .single();
  if (!existing || existing.seller_id !== user.id) {
    redirect("/listings/mine");
  }

  await supabase.from("listings").update({ status }).eq("id", listingId);

  revalidatePath("/browse");
  revalidatePath("/listings/mine");
  revalidatePath(`/listings/${listingId}`);
  redirect(`/listings/${listingId}`);
}
