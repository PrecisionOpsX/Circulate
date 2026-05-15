import "server-only";
import { createClient } from "@/lib/supabase/server";

/** A category / location / condition option. */
export type TaxonomyRow = { id: string; name: string; slug: string };

export type Taxonomies = {
  categories: TaxonomyRow[];
  locations: TaxonomyRow[];
  conditions: TaxonomyRow[];
};

/**
 * Loads the active dropdown taxonomies (categories, locations, conditions)
 * for listing forms and browse filters.
 */
export async function getTaxonomies(): Promise<Taxonomies> {
  const supabase = await createClient();
  const [categories, locations, conditions] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("locations")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("conditions")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return {
    categories: categories.data ?? [],
    locations: locations.data ?? [],
    conditions: conditions.data ?? [],
  };
}
