import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { VerificationBadges } from "@/components/account/VerificationBadges";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { profile } = await requireUser("/profile");
  const initial = profile.display_name.charAt(0).toUpperCase();

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl font-semibold text-brand-700">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
          <p className="text-sm text-muted">
            {profile.completed_trades} completed trade
            {profile.completed_trades === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <VerificationBadges
        emailVerified={profile.email_verified}
        phoneVerified={profile.phone_verified}
      />

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Edit profile</h2>
        <p className="mt-1 text-sm text-muted">
          This information appears on your public profile and listings.
        </p>
        <div className="mt-5">
          <ProfileForm profile={profile} />
        </div>
      </section>
    </div>
  );
}
