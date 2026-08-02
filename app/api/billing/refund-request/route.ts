import { NextResponse } from "next/server";
import { recordProductEvent } from "@/lib/billing/events";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { reason?: string };
    const reason = String(body.reason || "").trim().slice(0, 1000);
    const { data: subscription, error } = await supabase.from("subscriptions")
      .select("id,latest_invoice_id,amount,created_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!subscription) return NextResponse.json({ error: "No paid subscription was found." }, { status: 404 });
    const { count: priorRefunds } = await supabase.from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user.id)
      .eq("status", "approved");
    if (Number(priorRefunds || 0) > 0) return NextResponse.json({ error: "The seven-day guarantee has already been used for this account." }, { status: 409 });
    const eligible = Date.now() - new Date(subscription.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000;
    const { error: insertError } = await supabase.from("refund_requests").insert({
      user_id: data.user.id,
      subscription_id: subscription.id,
      stripe_invoice_id: subscription.latest_invoice_id,
      reason: reason || "No reason provided",
      eligible,
      status: "pending",
      amount: subscription.amount
    });
    if (insertError) throw insertError;
    await recordProductEvent({ userId: data.user.id, eventName: "refund_requested", properties: { eligible } });
    return NextResponse.json({ submitted: true, eligible });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit the refund request." }, { status: 500 });
  }
}
