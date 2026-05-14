import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Token-hash email confirmation.
 *
 * Use this route if you customise the Supabase email templates to use
 * `{{ .TokenHash }}` instead of the default `{{ .ConfirmationURL }}`
 * (recommended by Supabase for the SSR auth helpers). Links land here
 * as `?token_hash=...&type=...`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      const target = next.startsWith("/") ? next : "/dashboard";
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not verify your link. It may have expired.")}`,
  );
}
