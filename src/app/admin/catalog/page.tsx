import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Taxonomy } from "@/lib/supabase/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import {
  createCategoryAction,
  createLocationAction,
  createConditionAction,
  updateCategoryAction,
  updateLocationAction,
  updateConditionAction,
  toggleCategoryAction,
  toggleLocationAction,
  toggleConditionAction,
  deleteCategoryAction,
  deleteLocationAction,
  deleteConditionAction,
} from "./actions";

export const metadata: Metadata = { title: "Catalog" };

type Tab = "categories" | "locations" | "conditions";

const TABS: { key: Tab; label: string; singular: string; description: string }[] = [
  {
    key: "categories",
    label: "Categories",
    singular: "category",
    description:
      "Types of goods and services. Shown in the listing form and browse filters.",
  },
  {
    key: "locations",
    label: "Locations",
    singular: "location",
    description:
      "Neighborhood or area options. Shown in listings and browse filters.",
  },
  {
    key: "conditions",
    label: "Conditions",
    singular: "condition",
    description:
      "Item condition for physical goods. 'Not Applicable' is auto-selected for services.",
  },
];

const ACTIONS = {
  categories: {
    create: createCategoryAction,
    update: updateCategoryAction,
    toggle: toggleCategoryAction,
    remove: deleteCategoryAction,
  },
  locations: {
    create: createLocationAction,
    update: updateLocationAction,
    toggle: toggleLocationAction,
    remove: deleteLocationAction,
  },
  conditions: {
    create: createConditionAction,
    update: updateConditionAction,
    toggle: toggleConditionAction,
    remove: deleteConditionAction,
  },
} as const;

const PLACEHOLDERS: Record<Tab, string> = {
  categories: "e.g. Electronics",
  locations:  "e.g. Downtown",
  conditions: "e.g. Like New",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid:   "Name is required.",
  duplicate: "An item with that name already exists.",
  in_use:    "This option is used by one or more listings. Deactivate it instead of deleting.",
  failed:    "Something went wrong. Please try again.",
};

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { tab: tabParam, created, updated, deleted, error } =
    await searchParams;

  const activeTab: Tab =
    tabParam === "locations" || tabParam === "conditions"
      ? tabParam
      : "categories";

  // Fetch all items for every tab (admin sees inactive rows too).
  const supabase = await createClient();
  const [catRes, locRes, conRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, sort_order, is_active, created_at")
      .order("sort_order")
      .order("name"),
    supabase
      .from("locations")
      .select("id, name, slug, sort_order, is_active, created_at")
      .order("sort_order")
      .order("name"),
    supabase
      .from("conditions")
      .select("id, name, slug, sort_order, is_active, created_at")
      .order("sort_order")
      .order("name"),
  ]);

  const allData: Record<Tab, Taxonomy[]> = {
    categories: catRes.data ?? [],
    locations:  locRes.data ?? [],
    conditions: conRes.data ?? [],
  };

  const items   = allData[activeTab];
  const actions = ACTIONS[activeTab];
  const tabMeta = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-brand-900">
          Catalog options
        </h2>
        <p className="mt-1 text-sm text-muted">
          Manage the dropdown options shown in listing forms and browse filters.
          Deactivated options are hidden from new listings but kept for
          historical data.
        </p>
      </header>

      {/* ---- Tab bar ---- */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const activeCount = allData[t.key].filter((x) => x.is_active).length;
          return (
            <a
              key={t.key}
              href={`/admin/catalog?tab=${t.key}`}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
                {activeCount}
              </span>
            </a>
          );
        })}
      </div>

      {/* ---- Feedback alerts ---- */}
      {created && (
        <Alert variant="success">
          {tabMeta.singular.charAt(0).toUpperCase() + tabMeta.singular.slice(1)} added successfully.
        </Alert>
      )}
      {updated && <Alert variant="success">Option updated.</Alert>}
      {deleted && <Alert variant="success">Option deleted.</Alert>}
      {error && (
        <Alert variant="error">
          {ERROR_MESSAGES[error] ?? "Something went wrong."}
        </Alert>
      )}

      <p className="text-sm text-muted">{tabMeta.description}</p>

      {/* ---- Add new item ---- */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-brand-900">
          Add new {tabMeta.singular}
        </h3>
        <form action={actions.create} className="flex flex-wrap items-start gap-3">
          <div className="min-w-[200px] flex-1">
            <Field htmlFor="name" label="Name" required>
              <Input
                id="name"
                name="name"
                placeholder={PLACEHOLDERS[activeTab]}
                required
              />
            </Field>
          </div>
          <div className="w-28">
            <Field htmlFor="sortOrder" label="Sort order">
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                step={1}
                placeholder="0"
              />
            </Field>
            <p className="mt-1.5 text-sm text-muted">Lower = first.</p>
          </div>
          <div className="pt-[1.625rem]">
            <SubmitButton size="sm" pendingLabel="Adding...">
              Add
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* ---- Items list ---- */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          All {tabMeta.label.toLowerCase()} ({items.length})
        </h3>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No {tabMeta.label.toLowerCase()} yet. Add one above.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                actions={actions}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single taxonomy row: inline edit + right-aligned status + actions
// ---------------------------------------------------------------------------
function ItemRow({
  item,
  actions,
}: {
  item: Taxonomy;
  actions: (typeof ACTIONS)[Tab];
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      {/* Active indicator dot */}
      <div
        className={`h-2 w-2 shrink-0 rounded-full ${
          item.is_active ? "bg-green-500" : "bg-gray-300"
        }`}
      />

      {/* Inline edit form -- name + sort, then status + save */}
      <form
        action={actions.update}
        className="flex flex-1 flex-wrap items-center gap-3 min-w-0"
      >
        <input type="hidden" name="itemId" value={item.id} />
        <input
          name="name"
          defaultValue={item.name}
          className="min-w-[140px] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <input
          name="sortOrder"
          type="number"
          defaultValue={item.sort_order}
          min={0}
          className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            item.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {item.is_active ? "Active" : "Inactive"}
        </span>
        <SubmitButton size="sm" variant="secondary" pendingLabel="Saving...">
          Save
        </SubmitButton>
      </form>

      {/* Right-aligned: toggle + delete */}
      <div className="flex shrink-0 items-center gap-2">
        <form action={actions.toggle}>
          <input type="hidden" name="itemId"   value={item.id} />
          <input type="hidden" name="isActive" value={String(item.is_active)} />
          <SubmitButton
            size="sm"
            variant={item.is_active ? "secondary" : "ghost"}
            pendingLabel="..."
          >
            {item.is_active ? "Deactivate" : "Activate"}
          </SubmitButton>
        </form>

        <form action={actions.remove}>
          <input type="hidden" name="itemId" value={item.id} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="text-danger hover:bg-red-50 hover:text-danger"
            title="Delete — only allowed if no listings use this option"
          >
            Delete
          </Button>
        </form>
      </div>
    </li>
  );
}
