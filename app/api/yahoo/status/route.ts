import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidYahooToken } from "@/lib/yahoo/auth";
import { yahooConnectionEnabled } from "@/lib/yahoo/availability";
export async function GET() {
  try {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({connected: false, error: "Sign in required."}, {status: 401});
    const enabled = yahooConnectionEnabled(data.user.id);
    return NextResponse.json({enabled, connected: enabled && Boolean(await getValidYahooToken(data.user.id))});
  } catch {
    return NextResponse.json({connected: false, error: "Unable to verify Yahoo. Try again."}, {status: 503});
  }
}
