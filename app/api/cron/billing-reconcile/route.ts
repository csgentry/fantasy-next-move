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
  const { data, error } = await admin.from("subscriptions")
    .select("stripe_subscription_id")
    .in("status", ["active", "trialing", "past_due", "incomplete"])
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const row of data || []) {
    try {
      const subscription = await stripeRequest<Record<string, any>>(`/subscriptions/${row.stripe_subscription_id}`);
      await syncStripeSubscriptionObject(subscription);
      results.push({ id: row.stripe_subscription_id, ok: true });
    } catch (syncError) {
      results.push({ id: row.stripe_subscription_id, ok: false, error: syncError instanceof Error ? syncError.message : "Unknown error" });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
