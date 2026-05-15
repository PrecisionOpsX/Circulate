"use client";

import { useActionState, useState } from "react";
import {
  createListingAction,
  updateListingAction,
  type ListingFormState,
} from "@/app/listings/actions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PhotoUploader, type UploadedPhoto } from "@/components/listings/PhotoUploader";
import { LISTING_LIMITS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Listing, ListingType } from "@/lib/supabase/types";

type Option = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  userId: string;
  categories: Option[];
  locations: Option[];
  conditions: Option[];
  /** Present in edit mode. */
  listing?: Listing;
  initialPhotos?: UploadedPhoto[];
};

const initialState: ListingFormState = { ok: false };

export function ListingForm({
  mode,
  userId,
  categories,
  locations,
  conditions,
  listing,
  initialPhotos = [],
}: Props) {
  const action = mode === "edit" ? updateListingAction : createListingAction;
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const [type, setType] = useState<ListingType>(listing?.type ?? "goods");

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {mode === "edit" && listing && (
        <input type="hidden" name="listingId" value={listing.id} />
      )}

      {/* Type */}
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-foreground">
          Listing type<span className="ml-0.5 text-danger">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2">
          {(["goods", "service"] as const).map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold capitalize transition-colors",
                type === value
                  ? "border-circ-blue bg-blue-50 text-circ-blue-dark"
                  : "border-border bg-surface text-muted hover:border-brand-300",
              )}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="sr-only"
              />
              {value}
            </label>
          ))}
        </div>
        {errors.type && <p className="text-sm text-danger">{errors.type}</p>}
      </div>

      {/* Title */}
      <Field htmlFor="title" label="Title" required error={errors.title}>
        <Input
          id="title"
          name="title"
          defaultValue={listing?.title ?? ""}
          maxLength={LISTING_LIMITS.TITLE_MAX}
          placeholder={
            type === "service"
              ? "e.g. One hour of guitar lessons"
              : "e.g. Mid-century oak desk"
          }
          invalid={Boolean(errors.title)}
          required
        />
      </Field>

      {/* Category + Location */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="categoryId" label="Category" required error={errors.categoryId}>
          <Select
            id="categoryId"
            name="categoryId"
            defaultValue={listing?.category_id ?? ""}
            invalid={Boolean(errors.categoryId)}
            required
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="locationId" label="Location" required error={errors.locationId}>
          <Select
            id="locationId"
            name="locationId"
            defaultValue={listing?.location_id ?? ""}
            invalid={Boolean(errors.locationId)}
            required
          >
            <option value="" disabled>
              Select a location
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Condition + Price */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="conditionId"
          label="Condition"
          required={type === "goods"}
          error={errors.conditionId}
          hint={type === "service" ? "Optional for services" : undefined}
        >
          <Select
            id="conditionId"
            name="conditionId"
            defaultValue={listing?.condition_id ?? ""}
            invalid={Boolean(errors.conditionId)}
          >
            <option value="">
              {type === "service" ? "Not applicable" : "Select a condition"}
            </option>
            {conditions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor="price"
          label="Price in credits"
          required
          error={errors.price}
          hint="Use 0 to list something for free."
        >
          <div className="relative">
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              step="any"
              defaultValue={listing?.price ?? ""}
              placeholder="0"
              invalid={Boolean(errors.price)}
              className="pr-16"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
              credits
            </span>
          </div>
        </Field>
      </div>

      {/* Description */}
      <Field
        htmlFor="description"
        label="Description"
        error={errors.description}
        hint={`Describe the ${type === "service" ? "service" : "item"}, its condition, and any details. Max ${LISTING_LIMITS.DESCRIPTION_MAX} characters.`}
      >
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={listing?.description ?? ""}
          maxLength={LISTING_LIMITS.DESCRIPTION_MAX}
          placeholder="Add helpful details for buyers…"
          invalid={Boolean(errors.description)}
        />
      </Field>

      {/* Photos */}
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-foreground">Photos</span>
        <PhotoUploader userId={userId} initialPhotos={initialPhotos} />
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <SubmitButton
          size="lg"
          pendingLabel={mode === "edit" ? "Saving…" : "Publishing…"}
        >
          {mode === "edit" ? "Save changes" : "Publish listing"}
        </SubmitButton>
        <p className="text-xs text-muted">
          Your listing goes live immediately and can be edited anytime.
        </p>
      </div>
    </form>
  );
}
