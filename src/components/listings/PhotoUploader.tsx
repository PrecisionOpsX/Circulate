"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPTED_IMAGE_TYPES,
  LISTING_LIMITS,
  LISTING_PHOTOS_BUCKET,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export type UploadedPhoto = { url: string; path: string };

type Props = {
  /** Used to scope the storage object path; must match the signed-in user. */
  userId: string;
  /** Existing photos when editing a listing. */
  initialPhotos?: UploadedPhoto[];
};

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Multi-photo uploader. Files go straight to Supabase Storage on selection;
 * the resulting {url, path} pairs are emitted as hidden `photos` inputs so
 * the enclosing form submits them. The first photo is the listing cover.
 */
export function PhotoUploader({ userId, initialPhotos = [] }: Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initialPhotos);
  const [initialPaths] = useState(
    () => new Set(initialPhotos.map((p) => p.path)),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const atLimit = photos.length >= LISTING_LIMITS.MAX_PHOTOS;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const room = LISTING_LIMITS.MAX_PHOTOS - photos.length;
    const files = Array.from(fileList).slice(0, room);
    if (files.length < fileList.length) {
      setError(`You can upload up to ${LISTING_LIMITS.MAX_PHOTOS} photos.`);
    }

    setUploading(true);
    const uploaded: UploadedPhoto[] = [];
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as never)) {
        setError("Photos must be JPEG, PNG or WebP.");
        continue;
      }
      const ext = MIME_EXT[file.type] ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(LISTING_PHOTOS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        continue;
      }
      const { data } = supabase.storage
        .from(LISTING_PHOTOS_BUCKET)
        .getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, path });
    }
    setPhotos((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removePhoto(path: string) {
    setPhotos((prev) => prev.filter((p) => p.path !== path));
    // Only purge from storage if it was uploaded this session. Pre-existing
    // photos are reconciled by the updateListing action on save, so removing
    // then cancelling leaves them intact.
    if (!initialPaths.has(path)) {
      await supabase.storage.from(LISTING_PHOTOS_BUCKET).remove([path]);
    }
  }

  function makeCover(path: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.path === path);
      if (!target) return prev;
      return [target, ...prev.filter((p) => p.path !== path)];
    });
  }

  return (
    <div className="space-y-3">
      {/* hidden inputs carry the photos into the form submission */}
      {photos.map((p) => (
        <input key={p.path} type="hidden" name="photos" value={JSON.stringify(p)} />
      ))}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((p, i) => (
          <div
            key={p.path}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-brand-50"
          >
            <Image
              src={p.url}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
            />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Cover
              </span>
            )}
            <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-brand-900/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              {i !== 0 ? (
                <button
                  type="button"
                  onClick={() => makeCover(p.path)}
                  className="rounded-md bg-surface/90 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800"
                >
                  Make cover
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.path)}
                aria-label="Remove photo"
                className="flex h-6 w-6 items-center justify-center rounded-md bg-surface/90 text-danger"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {!atLimit && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted transition-colors",
              dragOver
                ? "border-circ-blue bg-blue-50 text-circ-blue"
                : "border-border hover:border-brand-300 hover:bg-brand-50",
            )}
          >
            {uploading ? (
              <span className="text-xs font-medium">Uploading…</span>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-xs font-medium">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-xs text-muted">
        Up to {LISTING_LIMITS.MAX_PHOTOS} photos. JPEG, PNG or WebP. The
        first photo is used as the cover.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
