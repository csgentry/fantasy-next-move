import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ImportedLeague } from "@/lib/types";

async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await authenticated();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (request.nextUrl.searchParams.get("all") === "1") {
      const { data, error } = await supabase.from("leagues")
        .select("id,provider,name,season,raw_data,selected_roster_id,is_active,synced_at")
        .eq("user_id", user.id)
        .order("synced_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json({ leagues: data || [] });
    }
    let query = supabase.from("leagues").select("raw_data,selected_roster_id,is_active,synced_at").eq("user_id", user.id).order("synced_at", { ascending: false }).limit(1);
    if (request.nextUrl.searchParams.get("active") === "1") query = query.eq("is_active", true);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return NextResponse.json(data ? { league: data.raw_data, selectedRosterId: data.selected_roster_id } : { league: null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load saved leagues." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await authenticated();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const body = await request.json() as { league?: ImportedLeague; selectedRosterId?: number | null };
    const league = body.league;
    if (!league?.leagueId || !league.provider || !Array.isArray(league.teams)) return NextResponse.json({ error: "A valid league is required." }, { status: 400 });
    if (league.leagueId.length > 180 || league.name.length > 180 || league.teams.length > 40 || (league.draftPicks?.length || 0) > 2000) {
      return NextResponse.json({ error: "The imported league exceeds beta storage limits." }, { status: 400 });
    }
    if (!/^\d{4}$/.test(league.season)) return NextResponse.json({ error: "League season must be a four-digit year." }, { status: 400 });
    await supabase.from("leagues").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
    const { error } = await supabase.from("leagues").upsert({
      user_id: user.id,
      provider: league.provider,
      provider_league_id: league.leagueId,
      name: league.name,
      season: Number(league.season),
      selected_roster_id: body.selectedRosterId ?? league.userRosterId ?? league.teams[0]?.rosterId ?? null,
      is_active: true,
      raw_data: league,
      synced_at: new Date().toISOString()
    }, { onConflict: "user_id,provider,provider_league_id,season" });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save the league." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { supabase, user } = await authenticated();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { error } = await supabase.from("leagues").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
    if (error) throw error;
    return NextResponse.json({ closed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to close the league." }, { status: 500 });
  }
}
