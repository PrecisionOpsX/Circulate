"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "./actions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Profile } from "@/lib/supabase/types";

const initialState: ProfileFormState = { ok: false };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(
    updateProfileAction,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      <Field
        htmlFor="displayName"
        label="Display name"
        required
        error={errors.displayName}
      >
        <Input
          id="displayName"
          name="displayName"
          defaultValue={profile.display_name}
          invalid={Boolean(errors.displayName)}
          required
        />
      </Field>

      <Field
        htmlFor="bio"
        label="Bio"
        error={errors.bio}
        hint="A short intro shown on your public profile. Max 280 characters."
      >
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={profile.bio ?? ""}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted"
          placeholder="Tell the community a bit about yourself…"
        />
      </Field>

      <Field
        htmlFor="avatarUrl"
        label="Avatar image URL"
        error={errors.avatarUrl}
        hint="Direct image link. Photo uploads arrive in a later milestone."
      >
        <Input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={profile.avatar_url ?? ""}
          placeholder="https://…"
          invalid={Boolean(errors.avatarUrl)}
        />
      </Field>

      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
