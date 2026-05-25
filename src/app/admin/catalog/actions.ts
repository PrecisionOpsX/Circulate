"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type TaxonomyTable = "categories" | "locations" | "conditions";

const LISTING_FIELD: Record<TaxonomyTable, string> = {
  categories: "category_id",
  locations:  "location_id",
  conditions: "condition_id",
};

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

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function revalidateCatalog() {
  revalidatePath("/admin/catalog");
  // Taxonomy changes affect listing forms and browse filters on all pages.
  revalidatePath("/", "layout");
}

// ---- Shared helpers ----

async function createItem(table: TaxonomyTable, formData: FormData): Promise<void> {
  const { supabase } = await requireAdminClient();

  const name      = String(formData.get("name")      ?? "").trim();
  const sortRaw   = String(formData.get("sortOrder")  ?? "").trim();
  if (!name) redirect(`/admin/catalog?error=invalid&tab=${table}`);

  const slug      = toSlug(name);
  const sortOrder = sortRaw ? parseInt(sortRaw, 10) : 0;

  const { error } = await supabase.from(table).insert({
    name,
    slug,
    sort_order: isNaN(sortOrder) ? 0 : sortOrder,
    is_active:  true,
  });

  if (error) {
    console.error(`[createItem:${table}]`, error.message);
    const code = error.code === "23505" ? "duplicate" : "failed";
    redirect(`/admin/catalog?error=${code}&tab=${table}`);
  }

  revalidateCatalog();
  redirect(`/admin/catalog?created=1&tab=${table}`);
}

async function updateItem(table: TaxonomyTable, formData: FormData): Promise<void> {
  const { supabase } = await requireAdminClient();

  const itemId    = String(formData.get("itemId")    ?? "").trim();
  const name      = String(formData.get("name")      ?? "").trim();
  const sortRaw   = String(formData.get("sortOrder") ?? "").trim();
  if (!itemId || !name) redirect(`/admin/catalog?error=invalid&tab=${table}`);

  const sortOrder = sortRaw ? parseInt(sortRaw, 10) : 0;

  const { error } = await supabase
    .from(table)
    .update({
      name,
      sort_order: isNaN(sortOrder) ? 0 : sortOrder,
    })
    .eq("id", itemId);

  if (error) {
    console.error(`[updateItem:${table}]`, error.message);
    redirect(`/admin/catalog?error=failed&tab=${table}`);
  }

  revalidateCatalog();
  redirect(`/admin/catalog?updated=1&tab=${table}`);
}

async function toggleItem(table: TaxonomyTable, formData: FormData): Promise<void> {
  const { supabase } = await requireAdminClient();

  const itemId   = String(formData.get("itemId")   ?? "").trim();
  const isActive = formData.get("isActive") === "true";
  if (!itemId) redirect(`/admin/catalog?error=invalid&tab=${table}`);

  const { error } = await supabase
    .from(table)
    .update({ is_active: !isActive })
    .eq("id", itemId);

  if (error) {
    console.error(`[toggleItem:${table}]`, error.message);
    redirect(`/admin/catalog?error=failed&tab=${table}`);
  }

  revalidateCatalog();
  redirect(`/admin/catalog?tab=${table}`);
}

async function deleteItem(table: TaxonomyTable, formData: FormData): Promise<void> {
  const { supabase } = await requireAdminClient();

  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) redirect(`/admin/catalog?error=invalid&tab=${table}`);

  // Guard: reject deletion if any listing still references this option.
  // (The FK is ON DELETE SET NULL, so the DB would silently orphan rows.)
  const field = LISTING_FIELD[table];
  const { count } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq(field, itemId);

  if ((count ?? 0) > 0) {
    redirect(`/admin/catalog?error=in_use&tab=${table}`);
  }

  const { error } = await supabase.from(table).delete().eq("id", itemId);

  if (error) {
    console.error(`[deleteItem:${table}]`, error.message);
    redirect(`/admin/catalog?error=failed&tab=${table}`);
  }

  revalidateCatalog();
  redirect(`/admin/catalog?deleted=1&tab=${table}`);
}

// ---- Per-table exported actions ----

export async function createCategoryAction(fd: FormData)  { return createItem("categories", fd); }
export async function createLocationAction(fd: FormData)  { return createItem("locations",  fd); }
export async function createConditionAction(fd: FormData) { return createItem("conditions", fd); }

export async function updateCategoryAction(fd: FormData)  { return updateItem("categories", fd); }
export async function updateLocationAction(fd: FormData)  { return updateItem("locations",  fd); }
export async function updateConditionAction(fd: FormData) { return updateItem("conditions", fd); }

export async function toggleCategoryAction(fd: FormData)  { return toggleItem("categories", fd); }
export async function toggleLocationAction(fd: FormData)  { return toggleItem("locations",  fd); }
export async function toggleConditionAction(fd: FormData) { return toggleItem("conditions", fd); }

export async function deleteCategoryAction(fd: FormData)  { return deleteItem("categories", fd); }
export async function deleteLocationAction(fd: FormData)  { return deleteItem("locations",  fd); }
export async function deleteConditionAction(fd: FormData) { return deleteItem("conditions", fd); }
