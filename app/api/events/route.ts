import { NextResponse } from "next/server";
import { recordProductEvent } from "@/lib/billing/events";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = new Set([
  "pricing_viewed", "league_connected", "trade_analyzed", "dashboard_viewed",
  "power_rankings_viewed", "cancellation_requested"
]);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { eventName?: string; properties?: Record<string, unknown> };
    if (!body.eventName || !ALLOWED.has(body.eventName)) return NextResponse.json({ error: "Unsupported event." }, { status: 400 });
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    await recordProductEvent({ userId: data.user?.id || null, eventName: body.eventName, properties: body.properties || {} });
    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 202 });
  }
}
