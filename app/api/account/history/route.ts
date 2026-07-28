import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LeagueHistoryPayload } from "@/lib/types";

async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await authenticated();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const provider = request.nextUrl.searchParams.get("provider");
    const leagueId = request.nextUrl.searchParams.get("leagueId");
    if (!provider || !leagueId) return NextResponse.json({ error: "Provider and league ID are required." }, { status: 400 });
    const { data, error } = await supabase.from("league_histories").select("raw_data").eq("user_id", user.id).eq("provider", provider).eq("current_league_id", leagueId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "No saved history." }, { status: 404 });
    return NextResponse.json({ history: data.raw_data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load league history." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await authenticated();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const body = await request.json() as { history?: LeagueHistoryPayload };
    const history = body.history;
    if (!history?.provider || !history.currentLeagueId || !Array.isArray(history.seasons)) return NextResponse.json({ error: "Valid history data is required." }, { status: 400 });
    if (history.currentLeagueId.length > 180 || history.seasons.length > 25 || history.seasons.some((season) => season.teams.length > 40)) {
      return NextResponse.json({ error: "The imported history exceeds beta storage limits." }, { status: 400 });
    }
    const { error } = await supabase.from("league_histories").upsert({
      user_id: user.id,
      provider: history.provider,
      current_league_id: history.currentLeagueId,
      raw_data: history,
      synced_at: new Date().toISOString()
    }, { onConflict: "user_id,provider,current_league_id" });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save league history." }, { status: 500 });
  }
}
