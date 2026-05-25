"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user + their admin status, or null/false. */
async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_view")
    .eq("id", user.id)
    .single();
  return {
    supabase,
    user,
    isAdmin: profile?.role === "admin",
    adminView: profile?.admin_view ?? false,
  };
}

/**
 * Set the signed-in admin's admin_view preference. The submitting form
 * carries a `view` field ("admin" | "customer"); this is explicit rather
 * than a blind toggle so the customer/admin headers can both target a
 * known state. After saving, the admin lands in the matching area.
 * Non-admins calling this are bounced to the dashboard.
 */
export async function setAdminViewAction(formData: FormData): Promise<void> {
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user || !isAdmin) {
    redirect("/dashboard");
  }

  const adminView = String(formData.get("view") ?? "") === "admin";

  await supabase
    .from("profiles")
    .update({ admin_view: adminView })
    .eq("id", user.id);

  // Refresh everything under the root layout so the Header / dropdown
  // pick up the new preference, then drop the admin into the matching area.
  revalidatePath("/", "layout");
  redirect(adminView ? "/admin" : "/dashboard");
}

/**
 * Promote a user to admin, or demote an admin back to a regular user.
 * Admin-only. The DB role-guard trigger is the real enforcement; this
 * is the friendly UI path plus a self-demotion guard.
 */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user || !isAdmin) {
    redirect("/dashboard");
  }

  const targetUserId = String(formData.get("userId") ?? "");
  const nextRole = String(formData.get("role") ?? "");
  if (
    !targetUserId ||
    (nextRole !== "admin" && nextRole !== "user")
  ) {
    redirect("/admin/users?error=invalid");
  }

  // Stop an admin from removing their own admin rights and locking
  // themselves out; another admin has to do it.
  if (targetUserId === user.id && nextRole !== "admin") {
    redirect("/admin/users?error=self");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", targetUserId);
  if (error) {
    redirect("/admin/users?error=failed");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}

/**
 * Transfer credits from the platform reserve to a single user's wallet
 * or broadcast to every user at once (recipientId === "__all__").
 * The atomic debit + credit happens inside the DB RPC functions.
 */
export async function grantCreditsAction(formData: FormData): Promise<void> {
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user || !isAdmin) redirect("/dashboard");

  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim();

  if (!recipientId || !Number.isFinite(amount) || amount <= 0) {
    redirect("/admin/reserve?error=invalid");
  }

  if (recipientId === "__all__") {
    // Broadcast the same amount to every user wallet.
    const { error } = await supabase.rpc("admin_grant_credits_all", {
      p_amount_each: amount,
      p_admin_id: user.id,
      p_note: note || null,
    });
    if (error) {
      const code = error.message.includes("insufficient") ? "insufficient"
        : error.message.includes("No user wallets") ? "no_users"
        : "failed";
      redirect(`/admin/reserve?error=${code}`);
    }
  } else {
    // Single-user grant.
    const { error } = await supabase.rpc("admin_grant_credits", {
      p_recipient_id: recipientId,
      p_amount: amount,
      p_admin_id: user.id,
      p_note: note || null,
    });
    if (error) {
      console.error(
        "[grantCreditsAction] RPC error:",
        error.code,
        error.message,
        error.details,
      );
      const msg = (error.message ?? "").toLowerCase();
      const code =
        error.code === "PGRST202" ||
        msg.includes("schema cache") ||
        msg.includes("could not find the function") ||
        msg.includes("does not exist")
          ? "no_function"
          : error.code === "P0002" || msg.includes("recipient wallet")
            ? "no_wallet"
            : msg.includes("insufficient")
              ? "insufficient"
              : "failed";
      redirect(`/admin/reserve?error=${code}`);
    }
  }

  revalidatePath("/admin/reserve");
  redirect("/admin/reserve?granted=1");
}

/**
 * Mint new credits directly into the reserve wallet without debiting any
 * source. Used when the admin needs more reserve capacity than fees alone
 * provide.
 */
export async function mintCreditsAction(formData: FormData): Promise<void> {
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user || !isAdmin) redirect("/dashboard");

  const amount = Number(formData.get("mintAmount"));
  const note = String(formData.get("mintNote") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    redirect("/admin/reserve?error=invalid_mint");
  }

  const { error } = await supabase.rpc("admin_mint_credits", {
    p_amount: amount,
    p_admin_id: user.id,
    p_note: note || null,
  });

  if (error) {
    redirect("/admin/reserve?error=mint_failed");
  }

  revalidatePath("/admin/reserve");
  redirect("/admin/reserve?minted=1");
}

/**
 * Update the singleton platform_settings row. Admin-only. The fee is
 * entered as a percentage in the UI and stored as a 0-1 rate. The DB
 * "platform_settings: admin write" RLS policy is the real enforcement.
 */
export async function updatePlatformSettingsAction(
  formData: FormData,
): Promise<void> {
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user || !isAdmin) {
    redirect("/dashboard");
  }

  const signupGrant = Number(formData.get("signupCreditGrant"));
  const feePercent = Number(formData.get("transactionFeePercent"));
  const monthlyCap = Number(formData.get("monthlyCreditPurchaseCap"));

  const valid =
    Number.isFinite(signupGrant) &&
    signupGrant >= 0 &&
    Number.isFinite(feePercent) &&
    feePercent >= 0 &&
    feePercent <= 100 &&
    Number.isFinite(monthlyCap) &&
    monthlyCap >= 0;
  if (!valid) {
    redirect("/admin/settings?error=invalid");
  }

  // Percentage in, 0-1 rate out. Rounded to 4 dp to match numeric(5,4).
  const feeRate = Math.round((feePercent / 100) * 10000) / 10000;

  const { error } = await supabase
    .from("platform_settings")
    .update({
      signup_credit_grant: signupGrant,
      transaction_fee_rate: feeRate,
      monthly_credit_purchase_cap: monthlyCap,
    })
    .eq("id", 1);
  if (error) {
    redirect("/admin/settings?error=failed");
  }

  // Settings feed pages across the whole app (signup grant, buy-credits
  // cap, fee copy), so revalidate the entire tree.
  revalidatePath("/", "layout");
  redirect("/admin/settings?updated=1");
}
