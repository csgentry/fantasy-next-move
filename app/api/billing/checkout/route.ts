import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { foundingCouponFor, priceIdFor, siteUrl, type BillingInterval, type BillingPlan } from "@/lib/billing/config";
import { recordProductEvent } from "@/lib/billing/events";
import { stripeRequest } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeCustomer = { id: string };
type CheckoutSession = { id: string; url: string | null };

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in before choosing a plan." }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { plan?: BillingPlan; interval?: BillingInterval };
    const plan = body.plan;
    const interval = body.interval;
    if (!plan || !["trade_lab", "all_access"].includes(plan) || !interval || !["month", "year"].includes(interval)) {
      return NextResponse.json({ error: "Choose a valid plan and billing interval." }, { status: 400 });
    }
    const priceId = priceIdFor(plan, interval);
    if (!priceId) return NextResponse.json({ error: "This Stripe price has not been configured yet." }, { status: 503 });

    const admin = createAdminClient();
    const { data: activeSubscription, error: subscriptionReadError } = await admin.from("subscriptions")
      .select("stripe_subscription_id,status")
      .eq("user_id", data.user.id)
      .in("status", ["active", "trialing", "past_due", "incomplete"])
      .limit(1)
      .maybeSingle();
    if (subscriptionReadError) throw subscriptionReadError;
    if (activeSubscription) {
      return NextResponse.json({ error: "You already have an active subscription. Use Manage Billing to change it." }, { status: 409 });
    }

    const { data: existingCustomer, error: customerReadError } = await admin.from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (customerReadError) throw customerReadError;
    let stripeCustomerId = existingCustomer?.stripe_customer_id || "";
    if (!stripeCustomerId) {
      const customer = await stripeRequest<StripeCustomer>("/customers", {
        method: "POST",
        idempotencyKey: `fnm-customer-${data.user.id}`,
        params: {
          email: data.user.email || undefined,
          metadata: { fantasy_next_move_user_id: data.user.id }
        }
      });
      stripeCustomerId = customer.id;
      const { error } = await admin.from("billing_customers").upsert({
        user_id: data.user.id,
        stripe_customer_id: stripeCustomerId,
        billing_email: data.user.email || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) throw error;
    }

    const stripeSubscriptions = await stripeRequest<{ data?: Array<{ status?: string }> }>("/subscriptions", {
      params: { customer: stripeCustomerId, status: "all", limit: 10 }
    });
    const existingStripeSubscription = (stripeSubscriptions.data || []).some((subscription) =>
      ["active", "trialing", "past_due", "incomplete"].includes(String(subscription.status || ""))
    );
    if (existingStripeSubscription) {
      return NextResponse.json({ error: "You already have an active Stripe subscription. Use Manage Billing to change it." }, { status: 409 });
    }

    const openSessions = await stripeRequest<{data?: Array<{id:string;status?:string;url:string|null;metadata?:Record<string,string>}>}>("/checkout/sessions", {params:{customer:stripeCustomerId,limit:10}});
    for (const open of openSessions.data || []) {
      if (open.status !== "open") continue;
      if (open.metadata?.fantasy_next_move_user_id !== data.user.id) continue;
      if (open.metadata.selected_plan === plan && open.metadata.billing_interval === interval && open.url) return NextResponse.json({url:open.url});
      await stripeRequest(`/checkout/sessions/${open.id}/expire`,{method:"POST"});
    }
    let foundingOffer = false;
    const coupon = interval === "year" ? foundingCouponFor(plan) : "";
    if (coupon) {
      const { data: reserved, error: reserveError } = await admin.rpc("reserve_founding_slot", {
        requested_user_id: data.user.id,
        requested_plan: plan
      });
      if (reserveError) throw reserveError;
      foundingOffer = reserved === true;
    }

    const session = await stripeRequest<CheckoutSession>("/checkout/sessions", {
      method: "POST",
      idempotencyKey: `fnm-checkout-${data.user.id}-${openSessions.data?.[0]?.id || "initial"}`,
      params: {
        mode: "subscription",
        customer: stripeCustomerId,
        client_reference_id: data.user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl()}/pricing?canceled=1`,
        billing_address_collection: "auto",
        allow_promotion_codes: false,
        automatic_tax: process.env.STRIPE_AUTOMATIC_TAX === "true" ? { enabled: true } : undefined,
        metadata: {
          fantasy_next_move_user_id: data.user.id,
          selected_plan: plan,
          billing_interval: interval,
          founding_offer: String(foundingOffer)
        },
        subscription_data: {
          metadata: {
            fantasy_next_move_user_id: data.user.id,
            selected_plan: plan,
            billing_interval: interval,
            founding_offer: String(foundingOffer)
          }
        },
        discounts: foundingOffer && coupon ? [{ coupon }] : undefined
      }
    });

    if (!session.url) throw new Error("Checkout URL unavailable.");
    if (foundingOffer) {
      await admin.from("founding_reservations").update({ checkout_session_id: session.id }).eq("user_id", data.user.id).eq("status", "reserved");
    }
    await recordProductEvent({ userId: data.user.id, eventName: "checkout_started", properties: { plan, interval, foundingOffer } });
    return NextResponse.json({ url: session.url, foundingOffer });
  } catch {
    return NextResponse.json({ error: "Unable to open secure checkout right now. Please try again or contact support." }, { status: 500 });
  }
}
