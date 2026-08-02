import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/billing/config";
import { recordProductEvent } from "@/lib/billing/events";
import { stripeRequest } from "@/lib/billing/stripe";

export const runtime = "nodejs";

type PortalSession = { url: string };

export async function POST() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: customer, error } = await supabase.from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!customer?.stripe_customer_id) return NextResponse.json({ error: "No billing account exists yet." }, { status: 404 });
    const portal = await stripeRequest<PortalSession>("/billing_portal/sessions", {
      method: "POST",
      params: { customer: customer.stripe_customer_id, return_url: `${siteUrl()}/account` }
    });
    await recordProductEvent({ userId: data.user.id, eventName: "billing_portal_opened" });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to open billing management." }, { status: 500 });
  }
}
