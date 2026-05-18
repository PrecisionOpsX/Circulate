"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LISTING_SORTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TaxonomyLite } from "@/lib/listings";

export type BrowseValues = {
  q: string;
  category: string;
  location: string;
  type: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

type Props = {
  values: BrowseValues;
  categories: TaxonomyLite[];
  locations: TaxonomyLite[];
  conditions: TaxonomyLite[];
};

const FILTER_KEYS: (keyof BrowseValues)[] = [
  "q",
  "category",
  "location",
  "type",
  "condition",
  "minPrice",
  "maxPrice",
  "sort",
];

/**
 * Search + filter controls for the browse grid.
 *
 * Every input is controlled by local state. Nothing pushes to the URL
 * until the user explicitly applies (Apply button, the Search button,
 * or pressing Enter in any input). While the new results load, all
 * inputs are disabled and the Apply button shows a spinner so it's
 * obvious work is in flight. Local state is re-synced from the
 * `values` prop whenever it changes externally.
 */
export function BrowseFilters({
  values,
  categories,
  locations,
  conditions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [local, setLocal] = useState<BrowseValues>(values);

  // Sync local state with the URL whenever the URL changes externally
  // (Clear all, deep link, browser nav). The "adjust state during render"
  // pattern keeps this effect-free.
  const externalKey = FILTER_KEYS.map((key) => values[key]).join(" ");
  const [lastExternal, setLastExternal] = useState(externalKey);
  if (lastExternal !== externalKey) {
    setLastExternal(externalKey);
    setLocal(values);
  }

  function setField<K extends keyof BrowseValues>(key: K, value: string) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = local[key];
      if (value && !(key === "sort" && value === "newest")) {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  // Whether the URL has any filters worth offering "Clear all" for.
  const hasAppliedFilters = FILTER_KEYS.some(
    (key) => key !== "sort" && values[key],
  );

  // Whether local edits differ from what is currently applied to the URL.
  const hasUnappliedChanges = FILTER_KEYS.some(
    (key) => local[key] !== values[key],
  );

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={isPending}
      className="relative rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      {/* Top progress bar while a navigation is in flight. */}
      {isPending && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-2xl bg-brand-100"
        >
          <div className="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,var(--color-circ-green),var(--color-circ-blue))]" />
        </div>
      )}

      {/* Keyword search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            name="q"
            type="search"
            value={local.q}
            onChange={(e) => setField("q", e.target.value)}
            placeholder="Search listings..."
            disabled={isPending}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          Search
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LabelledSelect
          label="Category"
          value={local.category}
          onChange={(v) => setField("category", v)}
          options={categories}
          allLabel="All categories"
          disabled={isPending}
        />
        <LabelledSelect
          label="Location"
          value={local.location}
          onChange={(v) => setField("location", v)}
          options={locations}
          allLabel="All locations"
          disabled={isPending}
        />
        <LabelledSelect
          label="Condition"
          value={local.condition}
          onChange={(v) => setField("condition", v)}
          options={conditions}
          allLabel="Any condition"
          disabled={isPending}
        />

        <div>
          <span className="mb-1 block text-xs font-medium text-muted">Type</span>
          <Select
            value={local.type}
            onChange={(e) => setField("type", e.target.value)}
            disabled={isPending}
          >
            <option value="">Goods &amp; services</option>
            <option value="goods">Goods only</option>
            <option value="service">Services only</option>
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-muted">
            Price (credits)
          </span>
          <div className="flex items-center gap-2">
            <Input
              name="minPrice"
              type="number"
              min={0}
              step="any"
              value={local.minPrice}
              onChange={(e) => setField("minPrice", e.target.value)}
              placeholder="Min"
              disabled={isPending}
            />
            <span className="text-muted">to</span>
            <Input
              name="maxPrice"
              type="number"
              min={0}
              step="any"
              value={local.maxPrice}
              onChange={(e) => setField("maxPrice", e.target.value)}
              placeholder="Max"
              disabled={isPending}
            />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-muted">
            Sort by
          </span>
          <Select
            value={local.sort}
            onChange={(e) => setField("sort", e.target.value)}
            disabled={isPending}
          >
            {LISTING_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant={hasUnappliedChanges ? "primary" : "secondary"}
          size="sm"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Spinner />
              Applying...
            </>
          ) : (
            "Apply filters"
          )}
        </Button>
        {!isPending && hasUnappliedChanges && (
          <span className="text-xs font-medium text-circ-blue">
            Unsaved changes
          </span>
        )}
        {hasAppliedFilters && (
          <Link
            href={pathname}
            aria-disabled={isPending}
            tabIndex={isPending ? -1 : undefined}
            onClick={(e) => {
              if (isPending) e.preventDefault();
            }}
            className={cn(
              "ml-auto text-sm font-medium text-muted hover:text-foreground",
              isPending && "pointer-events-none opacity-50",
            )}
          >
            Clear all
          </Link>
        )}
      </div>
    </form>
  );
}

function LabelledSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: TaxonomyLite[];
  allLabel: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.55" />
    </svg>
  );
}
