import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS, planForPriceId, type BillingPlan } from "./config";
import { recordBillingAudit } from "./events";

type StripeSubscription = Record<string, any>;

function isoFromUnix(value: unknown) {
  const seconds = Number(value || 0);
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

function customerId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id);
  return "";
}

export async function userIdForStripeCustomer(stripeCustomerId: string) {
  if (!stripeCustomerId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("billing_customers").select("user_id").eq("stripe_customer_id", stripeCustomerId).maybeSingle();
  return data?.user_id || null;
}

export async function syncStripeSubscriptionObject(subscription: StripeSubscription, stripeEventId?: string | null) {
  const admin = createAdminClient();
  const stripeCustomerId = customerId(subscription.customer);
  const metadataUserId = subscription.metadata?.fantasy_next_move_user_id || subscription.metadata?.user_id || null;
  const userId = metadataUserId || await userIdForStripeCustomer(stripeCustomerId);
  if (!userId) throw new Error(`No FantasyNextMove user is linked to Stripe customer ${stripeCustomerId || "unknown"}.`);

  const item = subscription.items?.data?.[0] || {};
  const price = item.price || {};
  const mapped = planForPriceId(price.id);
  const metadataPlan = subscription.metadata?.selected_plan as BillingPlan | undefined;
  const plan: BillingPlan = mapped?.plan || (metadataPlan === "trade_lab" ? "trade_lab" : "all_access");
  const interval = mapped?.interval || price.recurring?.interval || subscription.metadata?.billing_interval || "month";
  const periodStart = isoFromUnix(subscription.current_period_start || item.current_period_start);
  const periodEnd = isoFromUnix(subscription.current_period_end || item.current_period_end);
  const status = String(subscription.status || "incomplete");
  const active = status === "active" || status === "trialing";
  const graceActive = status === "past_due";
  const accessLevel = active || graceActive ? plan : "none";
  const { data: previous } = await admin.from("subscriptions")
    .select("status,plan,billing_interval,updated_at")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  const { data: previousEntitlement } = await admin.from("entitlements")
    .select("valid_until")
    .eq("user_id", userId)
    .maybeSingle();
  const validUntil = active
    ? periodEnd
    : graceActive
      ? previous?.status === "past_due" && previousEntitlement?.valid_until
        ? previousEntitlement.valid_until
        : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      : null;
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

  const { error: entitlementError } = await admin.from("entitlements").upsert({
    user_id: userId,
    access_level: accessLevel,
    access_source: "stripe",
    trade_lab_access: accessLevel === "trade_lab" || accessLevel === "all_access",
    all_access: accessLevel === "all_access",
    max_connected_leagues: accessLevel === "none" ? 0 : PLAN_LIMITS[plan],
    valid_until: validUntil,
    founding_member: foundingMember,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (entitlementError) throw entitlementError;

  await recordBillingAudit({
    userId,
    action: previous ? "subscription_updated" : "subscription_activated",
    previousValue: previous || null,
    newValue: { status, plan, interval, accessLevel, periodEnd },
    stripeEventId: stripeEventId || null
  });
  return { userId, plan, status, accessLevel };
}
