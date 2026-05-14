import { z } from "zod";

/**
 * Environment variable validation.
 *
 * `clientEnv`: NEXT_PUBLIC_* vars, safe to read in browser + server code.
 * `serverEnv`: secrets; only import from server-only modules.
 *
 * Validation runs at module load, so a misconfigured deploy fails fast
 * with a readable error instead of a confusing runtime crash later.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED: z
    .enum(["true", "false"])
    .default("false"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_STREAM_API_KEY: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  STREAM_API_SECRET: z.string().optional(),
});

function format(error: z.ZodError): string {
  return error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
}

// Next.js inlines process.env.NEXT_PUBLIC_* at build time, so they must be
// referenced explicitly (not via a dynamic key) to survive bundling.
const clientParsed = clientSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED:
    process.env.NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_STREAM_API_KEY: process.env.NEXT_PUBLIC_STREAM_API_KEY,
});

if (!clientParsed.success) {
  throw new Error(
    `Invalid public environment variables:\n${format(clientParsed.error)}\n` +
      `Copy .env.example to .env.local and fill in the values.`,
  );
}

export const clientEnv = clientParsed.data;

export const isPhoneVerificationEnabled =
  clientEnv.NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED === "true";

/**
 * Lazily validate + return server-only env. Call this inside server code
 * (route handlers, server actions). Throws if a required secret is missing.
 */
let serverEnvCache: z.infer<typeof serverSchema> | null = null;
export function getServerEnv() {
  if (serverEnvCache) return serverEnvCache;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    STREAM_API_SECRET: process.env.STREAM_API_SECRET,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${format(parsed.error)}`,
    );
  }
  serverEnvCache = parsed.data;
  return serverEnvCache;
}
