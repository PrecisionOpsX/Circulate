import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Routes that require an authenticated user. Dynamic owner-only routes
 * (e.g. /listings/[id]/edit) are additionally guarded in-page with
 * requireUser().
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/listings/new",
  "/listings/mine",
  "/favorites",
];

/**
 * Auth routes a logged-in user should be bounced away from.
 * Note: /reset-password is intentionally excluded. The recovery flow
 * signs the user in first, then sends them there to set a new password.
 */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

/**
 * Refreshes the Supabase auth session on every request and enforces
 * route protection. Must run in `middleware.ts` so Server Components
 * always see a fresh session.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase Auth. Do not
  // replace with getSession(), which trusts the (spoofable) cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
