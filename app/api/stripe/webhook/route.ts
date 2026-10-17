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
    if (!event?.id || typeof event.type !== "string" || !event.data?.object || event.livemode !== false) throw new Error("Invalid sandbox event.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook." }, { status: 400 });
  }

  let admin;
  try { admin = createAdminClient(); }
  catch { return NextResponse.json({ error: "Webhook storage is unavailable." }, { status: 503 }); }
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
    if (previousEventError) return NextResponse.json({ error: "Webhook storage read failed." }, { status: 500 });
    if (previousEvent?.processing_status === "processed") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    const recentlyProcessing = previousEvent?.processing_status === "processing"
      && Date.now() - new Date(previousEvent.received_at).getTime() < 5 * 60 * 1000;
    if (recentlyProcessing) {
      return NextResponse.json({ error: "This Stripe event is already processing." }, { status: 409 });
    }
    if (!previousEvent) return NextResponse.json({ error: "Webhook retry state is unavailable." }, { status: 503 });
    const { data: claimed, error: retryError } = await admin.from("stripe_events").update({
      event_type: event.type,
      processing_status: "processing",
      received_at: receivedAt,
      processed_at: null,
      error_message: null
    }).eq("stripe_event_id", event.id).eq("processing_status", previousEvent.processing_status).eq("received_at", previousEvent.received_at).select("stripe_event_id").maybeSingle();
    if (!retryError && !claimed) return NextResponse.json({ error: "Another worker claimed this event." }, { status: 409 });
    if (retryError) return NextResponse.json({ error: "Webhook retry could not be saved." }, { status: 500 });
  } else if (insertError) {
    return NextResponse.json({ error: "Webhook receipt could not be saved." }, { status: 500 });
  }

  try {
    async function syncOwned(subscription: Record<string, any>) {
      if (!await userIdForStripeCustomer(idOf(subscription.customer))) return null;
      return syncStripeSubscriptionObject(subscription, event.id);
    }
    const object = event.data?.object || {};
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const subscriptionId = idOf(object.subscription || object.parent?.subscription_details?.subscription);
      if (subscriptionId) {
        const subscription = await stripeRequest<Record<string, any>>(`/subscriptions/${subscriptionId}`);
        const synced = await syncOwned(subscription);
        if (synced) await recordProductEvent({ userId: synced.userId, eventName: "subscription_started", properties: { plan: synced.plan } });
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      const subscription = await stripeRequest<Record<string, any>>(`/subscriptions/${idOf(object)}`);
      await syncOwned(subscription);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const subscriptionId = idOf(object.subscription || object.parent?.subscription_details?.subscription);
      if (subscriptionId) {
        const subscription = await stripeRequest<Record<string, any>>(`/subscriptions/${subscriptionId}`);
        await syncOwned(subscription);
      }
    } else if (event.type === "customer.updated") {
      const customer = idOf(object);
      const userId = await userIdForStripeCustomer(customer);
      if (userId) {
        const { error } = await admin.from("billing_customers").update({ billing_email: object.email || null, updated_at: new Date().toISOString() }).eq("user_id", userId);
        if (error) throw error;
      }
    } else if (event.type === "charge.refunded") {
      const customer = idOf(object.customer);
      const userId = await userIdForStripeCustomer(customer);
      const fullyRefunded = Boolean(object.refunded) || Number(object.amount_refunded || 0) >= Number(object.amount || 0);
      const invoiceId = idOf(object.invoice);
      if (userId && fullyRefunded && invoiceId) {
        const invoice = await stripeRequest<Record<string, any>>(`/invoices/${invoiceId}`);
        const subscriptionId = idOf(invoice.subscription || invoice.parent?.subscription_details?.subscription);
        if (subscriptionId) {
          const canceled = await stripeRequest<Record<string, any>>(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
          await syncStripeSubscriptionObject(canceled, event.id);
        }
      }
      await recordBillingAudit({ userId, action: "charge_refunded", newValue: { charge: object.id, amountRefunded: object.amount_refunded, fullyRefunded }, stripeEventId: event.id });
    }

    const { data: completed, error: completionError } = await admin.from("stripe_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("stripe_event_id", event.id).eq("received_at", receivedAt).select("stripe_event_id").maybeSingle();
    if (completionError) throw completionError;
    if (!completed) throw new Error("Webhook processing lease changed.");
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    await admin.from("stripe_events").update({ processing_status: "failed", processed_at: new Date().toISOString(), error_message: message }).eq("stripe_event_id", event.id).eq("received_at", receivedAt);
    return NextResponse.json({ error: "Webhook processing failed. Delivery can be retried." }, { status: 500 });
  }
}
