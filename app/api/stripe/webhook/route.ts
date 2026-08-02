import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordBillingAudit, recordProductEvent } from "@/lib/billing/events";
import { stripeRequest, verifyStripeWebhook } from "@/lib/billing/stripe";
import { syncStripeSubscriptionObject, userIdForStripeCustomer } from "@/lib/billing/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function idOf(value: unknown) {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : "";
}

export async function POST(request: Request) {
  const raw = await request.text();
  let event: any;
  try {
    verifyStripeWebhook(raw, request.headers.get("stripe-signature"));
    event = JSON.parse(raw);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook." }, { status: 400 });
  }

  const admin = createAdminClient();
  const receivedAt = new Date().toISOString();
  const { error: insertError } = await admin.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processing_status: "processing",
    received_at: receivedAt
  });
  if (insertError?.code === "23505") {
    const { data: previousEvent, error: previousEventError } = await admin.from("stripe_events")
      .select("processing_status,received_at")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (previousEventError) return NextResponse.json({ error: previousEventError.message }, { status: 500 });
    if (previousEvent?.processing_status === "processed") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    const recentlyProcessing = previousEvent?.processing_status === "processing"
      && Date.now() - new Date(previousEvent.received_at).getTime() < 5 * 60 * 1000;
    if (recentlyProcessing) {
      return NextResponse.json({ error: "This Stripe event is already processing." }, { status: 409 });
    }
    const { error: retryError } = await admin.from("stripe_events").update({
      event_type: event.type,
      processing_status: "processing",
      received_at: receivedAt,
      processed_at: null,
      error_message: null
    }).eq("stripe_event_id", event.id);
    if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
  } else if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    const object = event.data?.object || {};
    if (event.type === "checkout.session.completed") {
      const userId = object.metadata?.fantasy_next_move_user_id || object.client_reference_id || null;
      const customer = idOf(object.customer);
      if (userId && customer) {
        await admin.from("billing_customers").upsert({
          user_id: userId,
          stripe_customer_id: customer,
          billing_email: object.customer_details?.email || object.customer_email || null,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      }
      const subscriptionId = idOf(object.subscription);
      if (subscriptionId) {
        const subscription = await stripeRequest<Record<string, any>>(`/subscriptions/${subscriptionId}`);
        const synced = await syncStripeSubscriptionObject(subscription, event.id);
        await recordProductEvent({ userId: synced.userId, eventName: "subscription_started", properties: { plan: synced.plan } });
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      await syncStripeSubscriptionObject(object, event.id);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const subscriptionId = idOf(object.subscription);
      if (subscriptionId) {
        const subscription = await stripeRequest<Record<string, any>>(`/subscriptions/${subscriptionId}`);
        await syncStripeSubscriptionObject(subscription, event.id);
      }
    } else if (event.type === "customer.updated") {
      const customer = idOf(object);
      const userId = await userIdForStripeCustomer(customer);
      if (userId) {
        await admin.from("billing_customers").update({ billing_email: object.email || null, updated_at: new Date().toISOString() }).eq("user_id", userId);
      }
    } else if (event.type === "charge.refunded") {
      const customer = idOf(object.customer);
      const userId = await userIdForStripeCustomer(customer);
      const fullyRefunded = Boolean(object.refunded) || Number(object.amount_refunded || 0) >= Number(object.amount || 0);
      const invoiceId = idOf(object.invoice);
      if (fullyRefunded && invoiceId) {
        const invoice = await stripeRequest<Record<string, any>>(`/invoices/${invoiceId}`);
        const subscriptionId = idOf(invoice.subscription);
        if (subscriptionId) {
          const canceled = await stripeRequest<Record<string, any>>(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
          await syncStripeSubscriptionObject(canceled, event.id);
        }
      }
      await recordBillingAudit({ userId, action: "charge_refunded", newValue: { charge: object.id, amountRefunded: object.amount_refunded, fullyRefunded }, stripeEventId: event.id });
    }

    await admin.from("stripe_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("stripe_event_id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    await admin.from("stripe_events").update({ processing_status: "failed", processed_at: new Date().toISOString(), error_message: message }).eq("stripe_event_id", event.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
