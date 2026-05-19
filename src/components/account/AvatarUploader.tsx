"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPTED_IMAGE_TYPES,
  AVATAR_BUCKET,
  AVATAR_LIMITS,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";

type Props = {
  /** Used to scope the storage object path; must match the signed-in user. */
  userId: string;
  /** First-letter fallback when there's no avatar. */
  displayName: string;
  /** Current avatar from the database, or null. */
  initialUrl: string | null;
  /** Storage object path for the current avatar, or null. */
  initialPath: string | null;
};

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Profile avatar picker.
 *
 * Uploads directly to the `avatars` Supabase Storage bucket on selection
 * and emits the resulting {url, path} as two hidden inputs so the parent
 * form submits them. Cleans up its own session uploads when the user
 * replaces or removes the photo; the DB's old path is cleaned up by the
 * server action on save.
 */
export function AvatarUploader({
  userId,
  displayName,
  initialUrl,
  initialPath,
}: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [path, setPath] = useState(initialPath ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const initial = displayName.charAt(0).toUpperCase() || "?";
  const hasAvatar = Boolean(url);

  /**
   * Delete a path from storage if and only if it was uploaded during
   * this session (i.e. not the original from the database). The action
   * deletes the original on save.
   */
  async function purgeSessionUpload(targetPath: string) {
    if (!targetPath) return;
    if (targetPath === initialPath) return;
    await supabase.storage.from(AVATAR_BUCKET).remove([targetPath]);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as never)) {
      setError("Photo must be JPEG, PNG or WebP.");
      return;
    }
    if (file.size > AVATAR_LIMITS.MAX_BYTES) {
      setError("Photo must be 50 MB or smaller.");
      return;
    }

    setUploading(true);
    const previousPath = path;

    const ext = MIME_EXT[file.type] ?? "jpg";
    const newPath = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(newPath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(newPath);

    setUrl(data.publicUrl);
    setPath(newPath);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    // Best-effort cleanup of an unsaved previous upload.
    await purgeSessionUpload(previousPath);
  }

  async function handleRemove() {
    const previousPath = path;
    setUrl("");
    setPath("");
    setError(null);
    await purgeSessionUpload(previousPath);
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
      <input type="hidden" name="avatarUrl" value={url} />
      <input type="hidden" name="avatarPath" value={path} />

      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-3xl font-semibold text-brand-700">
        {hasAvatar ? (
          <Image
            src={url}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        ) : (
          initial
        )}
      </div>

      <div className="w-full space-y-2 text-center sm:w-auto sm:text-left">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? "Uploading..."
              : hasAvatar
                ? "Change photo"
                : "Upload photo"}
          </Button>
          {hasAvatar && !uploading && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRemove}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">
          Square photos look best. Max 50 MB. JPEG, PNG or WebP.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
