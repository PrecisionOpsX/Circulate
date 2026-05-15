"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LISTING_SORTS } from "@/lib/constants";
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

/** Search + filter controls for the browse grid. Drives the URL query string. */
export function BrowseFilters({
  values,
  categories,
  locations,
  conditions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Auto-submit when a dropdown changes.
  const autoSubmit = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.currentTarget.form?.requestSubmit();
  };

  const hasFilters = FILTER_KEYS.some(
    (k) => k !== "sort" && values[k],
  );

  return (
    <form
      action={apply}
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
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
            defaultValue={values.q}
            placeholder="Search listings…"
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LabelledSelect
          name="category"
          label="Category"
          value={values.category}
          onChange={autoSubmit}
          options={categories}
          allLabel="All categories"
        />
        <LabelledSelect
          name="location"
          label="Location"
          value={values.location}
          onChange={autoSubmit}
          options={locations}
          allLabel="All locations"
        />
        <LabelledSelect
          name="condition"
          label="Condition"
          value={values.condition}
          onChange={autoSubmit}
          options={conditions}
          allLabel="Any condition"
        />

        <div>
          <span className="mb-1 block text-xs font-medium text-muted">Type</span>
          <Select name="type" defaultValue={values.type} onChange={autoSubmit}>
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
              defaultValue={values.minPrice}
              placeholder="Min"
            />
            <span className="text-muted">to</span>
            <Input
              name="maxPrice"
              type="number"
              min={0}
              step="any"
              defaultValue={values.maxPrice}
              placeholder="Max"
            />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-muted">
            Sort by
          </span>
          <Select name="sort" defaultValue={values.sort} onChange={autoSubmit}>
            {LISTING_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm">
          Apply filters
        </Button>
        {hasFilters && (
          <Link
            href={pathname}
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Clear all
          </Link>
        )}
      </div>
    </form>
  );
}

function LabelledSelect({
  name,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: TaxonomyLite[];
  allLabel: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <Select name={name} defaultValue={value} onChange={onChange}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
