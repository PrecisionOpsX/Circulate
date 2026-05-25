"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type AdImageEntry =
  | { id: string; kind: "url"; url: string }
  | { id: string; kind: "file"; file: File; preview: string };

type Props = {
  entries: AdImageEntry[];
  onEntriesChange: (entries: AdImageEntry[]) => void;
};

function newId() {
  return crypto.randomUUID();
}

/**
 * Banner image picker with a shared showcase for URL and uploaded images.
 * Use the + button to add each URL or file batch into the showcase before submit.
 */
export function AdImageField({ entries, onEntriesChange }: Props) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [urlInput, setUrlInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      return;
    }
    onEntriesChange([...entries, { id: newId(), kind: "url", url }]);
    setUrlInput("");
  };

  const addPendingFiles = () => {
    if (pendingFiles.length === 0) return;
    const added: AdImageEntry[] = pendingFiles.map((file) => ({
      id: newId(),
      kind: "file" as const,
      file,
      preview: URL.createObjectURL(file),
    }));
    onEntriesChange([...entries, ...added]);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeEntry = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (entry?.kind === "file") URL.revokeObjectURL(entry.preview);
    onEntriesChange(entries.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-5 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="imageMode"
            value="url"
            checked={mode === "url"}
            onChange={() => setMode("url")}
            className="h-4 w-4 text-brand-600 focus:ring-brand-200"
          />
          <span className="font-medium text-foreground">Use online URL</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="imageMode"
            value="upload"
            checked={mode === "upload"}
            onChange={() => setMode("upload")}
            className="h-4 w-4 text-brand-600 focus:ring-brand-200"
          />
          <span className="font-medium text-foreground">Upload image(s)</span>
        </label>
      </div>

      {mode === "url" ? (
        <Field
          htmlFor="imageUrlInput"
          label="Banner image URL"
          hint="Paste any public image URL. Recommended: 1200 x 200 px or wider."
        >
          <div className="flex gap-2">
            <Input
              id="imageUrlInput"
              type="url"
              placeholder="https://example.com/banner.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={addUrl}
              disabled={!urlInput.trim()}
              aria-label="Add image URL"
              className="shrink-0 px-3"
            >
              +
            </Button>
          </div>
        </Field>
      ) : (
        <Field
          htmlFor="imageFileInput"
          label="Banner image file(s)"
          hint="JPG, PNG, WebP or GIF. Add each selection to the showcase with +."
        >
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              id="imageFileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground
                file:mr-3 file:rounded-md file:border-0 file:bg-brand-100 file:px-3 file:py-1
                file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-200"
              onChange={(e) =>
                setPendingFiles(
                  e.target.files ? Array.from(e.target.files) : [],
                )
              }
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={addPendingFiles}
              disabled={pendingFiles.length === 0}
              aria-label="Add selected images"
              className="shrink-0 px-3"
            >
              +
            </Button>
          </div>
        </Field>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Added images ({entries.length})
          </p>
          <ul className="flex flex-wrap gap-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="relative h-16 w-28 overflow-hidden rounded-lg border border-border bg-brand-50"
              >
                <Image
                  src={entry.kind === "url" ? entry.url : entry.preview}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  aria-label="Remove image"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
