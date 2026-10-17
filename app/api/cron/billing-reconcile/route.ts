import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeRequest } from "@/lib/billing/stripe";
import { syncStripeSubscriptionObject } from "@/lib/billing/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const admin = createAdminClient();
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  let cursor = "";
  while (true) {
    let query = admin.from("subscriptions").select("stripe_subscription_id")
      .in("status", ["active", "trialing", "past_due", "incomplete", "unpaid", "paused"])
      .order("stripe_subscription_id", { ascending: true }).limit(100);
    if (cursor) query = query.gt("stripe_subscription_id", cursor);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Billing reconciliation storage unavailable." }, { status: 503 });
    for (const row of data || []) {
      try {
        const subscription = await stripeRequest<Record<string, any>>(`/subscriptions/${row.stripe_subscription_id}`);
        await syncStripeSubscriptionObject(subscription);
        results.push({ id: row.stripe_subscription_id, ok: true });
      } catch {
        results.push({ id: row.stripe_subscription_id, ok: false, error: "Subscription synchronization failed; retry required." });
      }
    }
    if (!data || data.length < 100) break;
    cursor = data[data.length - 1].stripe_subscription_id;
  }
  return NextResponse.json({ processed: results.length, results }, {status:results.some(result=>!result.ok)?503:200});
}
