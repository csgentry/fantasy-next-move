import { NextResponse } from "next/server";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { stripeRequest } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ signedIn: false, entitlement: null, subscription: null });
    const sessionId = new URL(request.url).searchParams.get("session_id");
    let checkout: { status: string; paymentStatus: string } | null = null;
    let subscriptionId: string | null = null;
    if (sessionId) {
      if (!/^cs_test_[a-zA-Z0-9_]+$/.test(sessionId)) return NextResponse.json({error:"Invalid sandbox checkout."},{status:400});
      const session = await stripeRequest<Record<string, any>>(`/checkout/sessions/${sessionId}`);
      const {data: customer,error} = await supabase.from("billing_customers").select("stripe_customer_id").eq("user_id",data.user.id).maybeSingle();
      if (error) throw error;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (session.livemode !== false || session.client_reference_id !== data.user.id || !customer?.stripe_customer_id || customer.stripe_customer_id !== customerId) return NextResponse.json({error:"Checkout not found for this account."},{status:404});
      subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;
      checkout = {status:session.status,paymentStatus:session.payment_status};
    }
    let query = supabase.from("subscriptions").select("plan,billing_interval,status,amount,currency,current_period_end,cancel_at_period_end,founding_member").eq("user_id",data.user.id);
    if (sessionId) query = query.eq("stripe_subscription_id",subscriptionId || "no_completed_subscription");
    const [entitlement,subscriptionResult,foundingResult] = await Promise.all([
      getUserEntitlement(supabase,data.user.id),
      query.order("updated_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("founding_members").select("founding_number").eq("user_id",data.user.id).maybeSingle()
    ]);
    if (subscriptionResult.error || foundingResult.error) throw new Error("Billing status storage unavailable.");
    return NextResponse.json({signedIn:true,entitlement,subscription:subscriptionResult.data || null,foundingNumber:foundingResult.data?.founding_number || null,checkout});
  } catch {
    return NextResponse.json({error:"We couldn’t confirm billing status. Please try again."},{status:503});
  }
}
