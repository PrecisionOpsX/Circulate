import type { Metadata } from "next";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { getRatingsForUser } from "@/lib/ratings";
import { VerificationBadges } from "@/components/account/VerificationBadges";
import { RatingStars } from "@/components/ratings/RatingStars";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { profile } = await requireUser("/profile");
  const ratings = await getRatingsForUser(profile.id);
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
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
          <p className="text-sm text-muted">
            {profile.completed_trades} completed trade
            {profile.completed_trades === 1 ? "" : "s"}
          </p>
          {profile.rating_count > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <RatingStars value={profile.rating_avg} size="sm" />
              <span className="text-xs text-muted">
                <span className="font-semibold text-brand-900">
                  {profile.rating_avg.toFixed(1)}
                </span>{" "}
                from {profile.rating_count}{" "}
                {profile.rating_count === 1 ? "rating" : "ratings"}
              </span>
            </div>
          )}
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

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Reviews from trade partners</h2>
        {ratings.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No reviews yet. Complete a trade and your partner can rate you.
          </p>
        ) : (
          <ul className="mt-4 space-y-5">
            {ratings.map((r) => (
              <li
                key={r.id}
                className="border-b border-border pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {r.rater?.avatar_url ? (
                        <Image
                          src={r.rater.avatar_url}
                          alt=""
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        (r.rater?.display_name ?? "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand-900">
                        {r.rater?.display_name ?? "A trade partner"}
                      </p>
                      <RatingStars value={r.stars} size="sm" />
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {r.review && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {r.review}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
