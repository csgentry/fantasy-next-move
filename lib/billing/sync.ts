import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS, planForPriceId, type BillingPlan } from "./config";
import { recordBillingAudit } from "./events";

type StripeSubscription = Record<string, any>;

function isoFromUnix(value: unknown) {
  const seconds = Number(value || 0);
  return Number.isFinite(seconds) && seconds > 0 && seconds < 8640000000000 ? new Date(seconds * 1000).toISOString() : null;
}

function customerId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id);
  return "";
}

export async function userIdForStripeCustomer(stripeCustomerId: string) {
  if (!stripeCustomerId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("billing_customers").select("user_id").eq("stripe_customer_id", stripeCustomerId).maybeSingle();
  if (error) throw error;
  return data?.user_id || null;
}

export async function syncStripeSubscriptionObject(subscription: StripeSubscription, stripeEventId?: string | null) {
  const admin = createAdminClient();
  const stripeCustomerId = customerId(subscription.customer);
  const item = subscription.items?.data?.[0] || {};
  const price = item.price || {};
  const mapped = planForPriceId(price.id);
  if (!mapped) throw new Error("Subscription price is not configured for this application.");
  if (subscription.livemode === true) throw new Error("Live billing is disabled.");
  const userId = await userIdForStripeCustomer(stripeCustomerId);
  if (!userId) throw new Error("No application user is linked to this Stripe customer.");
  const metadataUserId = subscription.metadata?.fantasy_next_move_user_id || subscription.metadata?.user_id;
  if (metadataUserId && metadataUserId !== userId) throw new Error("Stripe customer ownership does not match subscription metadata.");
  const plan: BillingPlan = mapped.plan;
  const interval = mapped?.interval || price.recurring?.interval || subscription.metadata?.billing_interval || "month";
  const periodStart = isoFromUnix(subscription.current_period_start || item.current_period_start);
  const periodEnd = isoFromUnix(subscription.current_period_end || item.current_period_end);
  const status = String(subscription.status || "incomplete");
  const active = status === "active" || status === "trialing";
  const graceActive = status === "past_due";
  const accessLevel = active || graceActive ? plan : "none";
  const { data: previous, error: previousError } = await admin.from("subscriptions")
    .select("status,plan,billing_interval,updated_at")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (previousError) throw previousError;
  const { data: previousEntitlement, error: previousEntitlementError } = await admin.from("entitlements")
    .select("valid_until,access_source,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (previousEntitlementError) throw previousEntitlementError;
  if (active && !periodEnd) throw new Error("Active subscription is missing a valid access expiration.");
  // Anchor grace to the billing period, never to webhook delivery/retry time.
  const validUntil = active ? periodEnd : graceActive
    ? previous?.status === "past_due" && previousEntitlement?.access_source === "stripe" && previousEntitlement.valid_until
      ? previousEntitlement.valid_until
      : periodStart ? new Date(Date.parse(periodStart) + 3 * 86400000).toISOString() : new Date(0).toISOString()
    : null;
  const preserveIndependentAccess = previousEntitlement && ["admin", "beta", "complimentary"].includes(previousEntitlement.access_source)
    && (!previousEntitlement.valid_until || Date.parse(previousEntitlement.valid_until) > Date.now());
  const requestedFoundingMember = String(subscription.metadata?.founding_offer || "") === "true";
  let foundingMember = false;
  if (requestedFoundingMember) {
    const { data: foundingNumber, error: foundingError } = await admin.rpc("claim_founding_member", {
      requested_user_id: userId,
      requested_plan: plan,
      requested_subscription_id: subscription.id,
      requested_discount_amount: plan === "trade_lab" ? 1000 : 2000
    });
    if (foundingError) throw foundingError;
    foundingMember = Number(foundingNumber || 0) > 0;
  }

  const { error } = await admin.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: stripeCustomerId,
    stripe_price_id: price.id || null,
    plan,
    billing_interval: interval,
    status,
    amount: price.unit_amount ?? null,
    currency: price.currency || "usd",
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    canceled_at: isoFromUnix(subscription.canceled_at),
    founding_member: foundingMember,
    latest_invoice_id: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id || null,
    updated_at: new Date().toISOString()
  }, { onConflict: "stripe_subscription_id" });
  if (error) throw error;

  const entitlementValues = {
    user_id: userId,
    access_level: accessLevel,
    access_source: "stripe",
    trade_lab_access: accessLevel === "trade_lab" || accessLevel === "all_access",
    all_access: accessLevel === "all_access",
    max_connected_leagues: accessLevel === "none" ? 0 : PLAN_LIMITS[plan],
    valid_until: validUntil,
    founding_member: foundingMember,
    updated_at: new Date().toISOString()
  };
  if (!preserveIndependentAccess) {
    if (previousEntitlement) {
      const { data: updated, error: entitlementError } = await admin.from("entitlements").update(entitlementValues)
        .eq("user_id", userId).eq("updated_at", previousEntitlement.updated_at).select("user_id").maybeSingle();
      if (entitlementError) throw entitlementError;
      if (!updated) throw new Error("Entitlement changed during synchronization; retry required.");
    } else {
      const { error: entitlementError } = await admin.from("entitlements").insert(entitlementValues);
      if (entitlementError) throw entitlementError;
    }
  }

  await recordBillingAudit({
    userId,
    action: previous ? "subscription_updated" : "subscription_activated",
    previousValue: previous || null,
    newValue: { status, plan, interval, accessLevel, periodEnd },
    stripeEventId: stripeEventId || null
  });
  return { userId, plan, status, accessLevel };
}
