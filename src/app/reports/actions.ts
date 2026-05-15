"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { reportSchema } from "@/lib/validation";

export type ReportFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** File a moderation report against a listing. */
export async function reportListingAction(
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to report." };

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return { ok: false, error: "Missing listing reference." };

  const parsed = reportSchema.safeParse({
    reason: formData.get("reason"),
    details: formData.get("details") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "listing",
    target_id: listingId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "Thanks. Our team will review this listing." };
}
