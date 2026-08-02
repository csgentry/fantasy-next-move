"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin";

export type InviteActionState = {
  status: "idle" | "success" | "error";
  message: string;
  code: string;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function looksLikeEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createInvite(
  _previousState: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const user = await getAdminUser();
  if (!user) {
    return {
      status: "error",
      message: "Your admin session expired. Sign in again.",
      code: ""
    };
  }

  const email = value(formData, "email").toLowerCase();
  const expiresInDays = Number(value(formData, "expiresInDays") || "14");

  if (!looksLikeEmail(email) || email.length > 254) {
    return {
      status: "error",
      message: "Enter a valid email address for the beta tester.",
      code: ""
    };
  }

  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) {
    return {
      status: "error",
      message: "Expiration must be between 1 and 90 days.",
      code: ""
    };
  }


  const code = `FNM-${randomBytes(18).toString("base64url")}`;
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("beta_invites").insert({
      code_hash: codeHash,
      email,
      active: true,
      max_uses: 1,
      uses: 0,
      expires_at: expiresAt
    });

    if (error) {
      return {
        status: "error",
        message: error.message,
        code: ""
      };
    }

    revalidatePath("/admin");

    return {
      status: "success",
      message: `Invite created for ${email}. Copy it now—the plaintext code is not stored.`,
      code
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create the invite.",
      code: ""
    };
  }
}

export async function expireInvite(formData: FormData) {
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized.");

  const inviteId = value(formData, "inviteId");
  if (!inviteId) throw new Error("Invite ID is required.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("beta_invites")
    .update({ active: false })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function grantComplimentaryAccess(formData: FormData) {
  const actor = await getAdminUser();
  if (!actor) throw new Error("Unauthorized.");
  const userId = value(formData, "userId");
  const accessLevel = value(formData, "accessLevel");
  const days = Number(value(formData, "days") || "30");
  const reason = value(formData, "reason") || "Admin complimentary access";
  if (!userId || !["trade_lab", "all_access"].includes(accessLevel)) throw new Error("A valid user and access level are required.");
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Days must be between 1 and 3650.");
  const admin = createAdminClient();
  const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from("entitlements").upsert({
    user_id: userId,
    access_level: accessLevel,
    access_source: "complimentary",
    trade_lab_access: true,
    all_access: accessLevel === "all_access",
    max_connected_leagues: accessLevel === "all_access" ? 10 : 3,
    valid_until: validUntil,
    override_reason: reason,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  await admin.from("billing_audit_log").insert({
    user_id: userId,
    actor_user_id: actor.id,
    action: "complimentary_access_granted",
    new_value: { accessLevel, validUntil },
    reason
  });
  revalidatePath("/admin");
}

export async function revokeComplimentaryAccess(formData: FormData) {
  const actor = await getAdminUser();
  if (!actor) throw new Error("Unauthorized.");
  const userId = value(formData, "userId");
  if (!userId) throw new Error("User ID is required.");
  const admin = createAdminClient();
  const { data: entitlement } = await admin.from("entitlements").select("access_source").eq("user_id", userId).maybeSingle();
  if (entitlement?.access_source === "stripe") throw new Error("Paid Stripe access must be changed through Stripe, not an admin override.");
  const { error } = await admin.from("entitlements").upsert({
    user_id: userId,
    access_level: "none",
    access_source: "none",
    trade_lab_access: false,
    all_access: false,
    max_connected_leagues: 0,
    valid_until: new Date().toISOString(),
    override_reason: "Revoked by administrator",
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  await admin.from("profiles").update({ beta_access: false }).eq("id", userId);
  await admin.from("billing_audit_log").insert({ user_id: userId, actor_user_id: actor.id, action: "complimentary_access_revoked" });
  revalidatePath("/admin");
}

export async function denyRefund(formData: FormData) {
  const actor = await getAdminUser();
  if (!actor) throw new Error("Unauthorized.");
  const requestId = value(formData, "requestId");
  const note = value(formData, "note") || "Request denied after review.";
  const admin = createAdminClient();
  const { error } = await admin.from("refund_requests").update({
    status: "denied",
    resolved_at: new Date().toISOString(),
    resolved_by: actor.id,
    resolution_note: note
  }).eq("id", requestId).eq("status", "pending");
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function approveRefund(formData: FormData) {
  const actor = await getAdminUser();
  if (!actor) throw new Error("Unauthorized.");
  const requestId = value(formData, "requestId");
  const note = value(formData, "note") || "Seven-day guarantee approved.";
  if (!requestId) throw new Error("Refund request ID is required.");
  const admin = createAdminClient();
  const { data: request, error } = await admin.from("refund_requests")
    .select("id,user_id,eligible,status,stripe_invoice_id,subscription_id,subscriptions(stripe_subscription_id)")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !request) throw new Error(error?.message || "Refund request not found.");
  if (request.status !== "pending") throw new Error("This refund request was already resolved.");
  if (!request.eligible) throw new Error("This request is outside the seven-day guarantee window. Deny it or process a manual exception in Stripe.");
  if (!request.stripe_invoice_id) throw new Error("The request has no Stripe invoice to refund.");

  const { stripeRequest } = await import("@/lib/billing/stripe");
  const invoice = await stripeRequest<Record<string, any>>(`/invoices/${request.stripe_invoice_id}`);
  const paymentIntent = typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id;
  const charge = typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id;
  if (!paymentIntent && !charge) throw new Error("Stripe has not attached a refundable payment to this invoice yet.");
  const refund = await stripeRequest<Record<string, any>>("/refunds", {
    method: "POST",
    params: paymentIntent ? { payment_intent: paymentIntent, reason: "requested_by_customer" } : { charge, reason: "requested_by_customer" }
  });
  const subscriptionRelation = Array.isArray(request.subscriptions) ? request.subscriptions[0] : request.subscriptions;
  const subscriptionId = subscriptionRelation?.stripe_subscription_id;
  if (subscriptionId) await stripeRequest(`/subscriptions/${subscriptionId}`, { method: "DELETE" });

  await admin.from("refund_requests").update({
    status: "approved",
    stripe_refund_id: refund.id,
    resolved_at: new Date().toISOString(),
    resolved_by: actor.id,
    resolution_note: note
  }).eq("id", requestId);
  await admin.from("entitlements").upsert({
    user_id: request.user_id,
    access_level: "none",
    access_source: "stripe",
    trade_lab_access: false,
    all_access: false,
    max_connected_leagues: 0,
    valid_until: new Date().toISOString(),
    override_reason: "Refund approved",
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  await admin.from("billing_audit_log").insert({
    user_id: request.user_id,
    actor_user_id: actor.id,
    action: "refund_approved",
    new_value: { refundId: refund.id },
    reason: note
  });
  revalidatePath("/admin");
}
