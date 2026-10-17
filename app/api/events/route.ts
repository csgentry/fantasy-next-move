import {CLIENT_EVENTS} from "@/lib/product-events";
import { NextResponse } from "next/server";
import { recordProductEvent } from "@/lib/billing/events";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = CLIENT_EVENTS;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { eventName?: string; properties?: Record<string, unknown> };
    if (!body.eventName || !ALLOWED.has(body.eventName)) return NextResponse.json({ error: "Unsupported event." }, { status: 400 });
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if(!data.user) return NextResponse.json({recorded:false}, {status:202});
    const recorded = await recordProductEvent({ userId: data.user.id, eventName: body.eventName, properties: {} });
    return NextResponse.json({ recorded }, {status:recorded?200:202});
  } catch {
    return NextResponse.json({ recorded: false }, { status: 202 });
  }
}
