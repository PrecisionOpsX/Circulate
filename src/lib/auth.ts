import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

/**
 * The authenticated user plus their profile row, as seen by Server
 * Components / Server Actions. Null when signed out.
 */
export type SessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
  profile: Profile;
};

/** Returns the current user + profile, or null if not signed in. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();

  // getUser() verifies the JWT with Supabase Auth, so it is trustworthy in RSC.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // A signed-in user with no profile row means the bootstrap trigger
  // hasn't run (or failed), so treat as unauthenticated rather than crash.
  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    profile,
  };
}

/**
 * Like getSessionUser() but redirects to /login when signed out.
 * Use at the top of protected Server Components.
 */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const params = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${params}`);
  }
  return user;
}

/** Redirects to /login, then to a 403 page if the user isn't an admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.profile.role !== "admin") redirect("/dashboard");
  return user;
}
