import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidYahooToken } from "@/lib/yahoo/auth";
import { yahooUserInfo } from "@/lib/yahoo/api";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ connected: false, error: "Sign in required." }, { status: 401 });
    const token = await getValidYahooToken(data.user.id);
    if (!token) return NextResponse.json({ connected: false });
    const user = await yahooUserInfo(token);
    return NextResponse.json({
      connected: true,
      user: user ? {
        userId: user.sub || "yahoo-user",
        displayName: user.name || user.nickname || "Yahoo Manager",
        email: user.email || null,
        avatar: user.picture || null
      } : null
    });
  } catch (error) {
    return NextResponse.json({ connected: false, error: error instanceof Error ? error.message : "Unable to verify Yahoo." }, { status: 500 });
  }
}
