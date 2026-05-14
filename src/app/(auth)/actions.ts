"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientEnv, isPhoneVerificationEnabled } from "@/lib/env";
import {
  loginSchema,
  signupSchema,
  phoneSchema,
  otpSchema,
  requestResetSchema,
  updatePasswordSchema,
} from "@/lib/validation";

/** Standard return shape for auth form actions used with useActionState. */
export type AuthFormState = {
  ok: boolean;
  error?: string;
  /** Per-field validation messages, keyed by field name. */
  fieldErrors?: Record<string, string>;
  /** Success / informational message. */
  message?: string;
};

/** Flatten a ZodError into a { field: message } map. */
function fieldErrorsOf(
  error: import("zod").ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

// ============================================================
// Sign up with email + password, including Terms acceptance.
// ============================================================
export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptedTerms: formData.get("acceptedTerms") === "on",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { displayName, email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        display_name: displayName,
        // Read by the handle_new_user() DB trigger to stamp accepted_terms_at.
        accepted_terms: "true",
      },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Duplicate-account prevention: when an email is already registered,
  // Supabase returns a user with an empty `identities` array instead of
  // erroring (this avoids account enumeration). Treat that as a dup.
  const isDuplicate =
    data.user && Array.isArray(data.user.identities) &&
    data.user.identities.length === 0;
  if (isDuplicate) {
    return {
      ok: false,
      error:
        "An account with this email already exists. Try logging in instead.",
    };
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

// ============================================================
// Log in with email + password.
// ============================================================
export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Supabase returns "Email not confirmed" verbatim, so route the user
    // to the verification screen instead of showing a dead-end error.
    if (error.message.toLowerCase().includes("not confirmed")) {
      redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
    }
    return { ok: false, error: "Invalid email or password." };
  }

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/dashboard");
}

// ============================================================
// Sign out.
// ============================================================
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ============================================================
// Resend the email-verification link.
// ============================================================
export async function resendEmailAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Missing email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, message: `Verification email re-sent to ${email}.` };
}

// ============================================================
// Phone verification (env-gated; needs Twilio configured in Supabase).
// Step 1: attach the phone number to the account and send an SMS code.
// ============================================================
export async function sendPhoneOtpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isPhoneVerificationEnabled) {
    return {
      ok: false,
      error:
        "Phone verification isn't enabled yet. Configure Twilio in Supabase and set NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true.",
    };
  }

  const parsed = phoneSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const { phone } = parsed.data;

  // App-level duplicate-account guard: block a phone number that is
  // already verified on another profile. (A unique index also enforces
  // this at the DB layer.)
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  if (existing && existing.id !== user.id) {
    return {
      ok: false,
      error: "That phone number is already linked to another account.",
    };
  }

  // updateUser with a phone triggers an SMS OTP via the Supabase phone provider.
  const { error } = await supabase.auth.updateUser({ phone });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `We sent a 6-digit code to ${phone}.`,
  };
}

// Step 2: confirm the SMS code.
export async function verifyPhoneOtpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isPhoneVerificationEnabled) {
    return { ok: false, error: "Phone verification isn't enabled yet." };
  }

  const parsed = otpSchema.safeParse({
    phone: formData.get("phone"),
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "phone_change",
  });

  if (error) return { ok: false, error: error.message };

  // The on_auth_user_verified DB trigger flips profiles.phone_verified.
  revalidatePath("/settings");
  revalidatePath("/profile");
  return { ok: true, message: "Phone number verified." };
}

// ============================================================
// Password reset, step 1: email a recovery link.
// ============================================================
export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      // The recovery link routes through /auth/callback, which exchanges the
      // code for a session and then forwards to /reset-password.
      redirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
    },
  );

  if (error) return { ok: false, error: error.message };

  // Always report success, never revealing whether the email is registered.
  return {
    ok: true,
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

// Password reset, step 2: set a new password (requires the recovery session
// established by the /auth/callback exchange).
export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error:
        "Your reset link has expired or is invalid. Request a new one from the forgot-password page.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };

  redirect("/dashboard");
}
