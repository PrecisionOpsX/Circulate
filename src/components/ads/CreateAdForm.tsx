"use client";

import { useState, useTransition } from "react";
import { createAdAction } from "@/app/admin/ads/actions";
import { AD_SLOTS } from "@/lib/ad-slots";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  AdImageField,
  type AdImageEntry,
} from "@/components/ads/AdImageField";

type ManifestEntry =
  | { type: "url"; url: string }
  | { type: "file"; index: number };

export function CreateAdForm() {
  const [images, setImages] = useState<AdImageEntry[]>([]);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const manifest: ManifestEntry[] = [];
    const files: File[] = [];

    for (const entry of images) {
      if (entry.kind === "url") {
        manifest.push({ type: "url", url: entry.url });
      } else {
        manifest.push({ type: "file", index: files.length });
        files.push(entry.file);
      }
    }

    fd.set("imagesManifest", JSON.stringify(manifest));
    files.forEach((file) => fd.append("imageFile", file));

    startTransition(() => {
      createAdAction(fd);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-border bg-surface p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="slot" label="Slot" required>
          <select
            id="slot"
            name="slot"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">Select a slot...</option>
            {AD_SLOTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          htmlFor="isEnabled"
          label="Status"
          hint="Uncheck to save as a draft."
        >
          <label className="flex cursor-pointer items-center gap-2 pt-1.5">
            <input
              type="checkbox"
              id="isEnabled"
              name="isEnabled"
              value="on"
              defaultChecked
              className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-200"
            />
            <span className="text-sm text-foreground">Enable immediately</span>
          </label>
        </Field>
      </div>

      <AdImageField entries={images} onEntriesChange={setImages} />

      <Field
        htmlFor="linkUrl"
        label="Click-through URL"
        hint="Where the user goes when they click the banner."
        required
      >
        <Input
          id="linkUrl"
          name="linkUrl"
          type="url"
          placeholder="https://example.com"
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="startDate"
          label="Start date (optional)"
          hint="Leave blank to go live immediately."
        >
          <Input id="startDate" name="startDate" type="date" />
        </Field>

        <Field
          htmlFor="endDate"
          label="End date (optional)"
          hint="Leave blank to run indefinitely."
        >
          <Input id="endDate" name="endDate" type="date" />
        </Field>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <SubmitButton
          size="sm"
          pendingLabel="Creating..."
          disabled={pending || images.length === 0}
        >
          Create ad
        </SubmitButton>
      </div>
    </form>
  );
}
