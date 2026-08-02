import { NextResponse } from "next/server";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ signedIn: false, entitlement: null, subscription: null });
  const [entitlement, subscriptionResult, foundingResult] = await Promise.all([
    getUserEntitlement(supabase, data.user.id),
    supabase.from("subscriptions")
      .select("plan,billing_interval,status,amount,currency,current_period_end,cancel_at_period_end,founding_member")
      .eq("user_id", data.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("founding_members").select("founding_number").eq("user_id", data.user.id).maybeSingle()
  ]);
  return NextResponse.json({
    signedIn: true,
    entitlement,
    subscription: subscriptionResult.data || null,
    foundingNumber: foundingResult.data?.founding_number || null
  });
}
