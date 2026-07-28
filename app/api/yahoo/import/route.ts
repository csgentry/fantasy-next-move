import { NextRequest, NextResponse } from "next/server";
import { getValidYahooToken } from "@/lib/yahoo/auth";
import { importYahooSeason, yahooUserInfo } from "@/lib/yahoo/api";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const season = request.nextUrl.searchParams.get("season")?.trim() || String(new Date().getFullYear());
  if (!/^\d{4}$/.test(season)) return NextResponse.json({ error: "Season must be a four-digit year." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const token = await getValidYahooToken(data.user.id);
    if (!token) return NextResponse.json({ error: "Connect Yahoo before importing leagues." }, { status: 401 });
    const [leagues, info] = await Promise.all([importYahooSeason(token, season), yahooUserInfo(token)]);
    return NextResponse.json({
      provider: "yahoo",
      user: {
        userId: info?.sub || "yahoo-user",
        displayName: info?.name || info?.nickname || "Yahoo Manager",
        email: info?.email || null,
        avatar: info?.picture || null
      },
      season,
      leagues
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import Yahoo leagues." }, { status: 502 });
  }
}
