"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "./actions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AvatarUploader } from "@/components/account/AvatarUploader";
import type { Profile } from "@/lib/supabase/types";

const initialState: ProfileFormState = { ok: false };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(
    updateProfileAction,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-foreground">
          Profile photo
        </span>
        <AvatarUploader
          userId={profile.id}
          displayName={profile.display_name}
          initialUrl={profile.avatar_url}
          initialPath={profile.avatar_path}
        />
        {(errors.avatarUrl || errors.avatarPath) && (
          <p className="text-sm text-danger">
            {errors.avatarUrl ?? errors.avatarPath}
          </p>
        )}
      </div>

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
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={profile.bio ?? ""}
          placeholder="Tell the community a bit about yourself..."
          invalid={Boolean(errors.bio)}
        />
      </Field>

      <SubmitButton pendingLabel="Saving...">Save changes</SubmitButton>
    </form>
  );
}
