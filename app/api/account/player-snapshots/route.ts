import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const leagueId = request.nextUrl.searchParams.get("leagueId")?.trim();
    const playerId = request.nextUrl.searchParams.get("playerId")?.trim();
    const week = Number(request.nextUrl.searchParams.get("week") || 0);
    if (!leagueId) return NextResponse.json({ error: "League ID is required." }, { status: 400 });

    let query = supabase
      .from("player_weekly_snapshots")
      .select("season,week,player_id,player_name,position,nfl_team,roster_id,is_rostered,is_starter,projection_stats,actual_stats,projected_points,actual_points,projection_error,absolute_error,synced_at")
      .eq("user_id", data.user.id)
      .eq("provider_league_id", leagueId)
      .order("week", { ascending: false })
      .limit(1000);
    if (playerId) query = query.eq("player_id", playerId);
    if (Number.isInteger(week) && week > 0) query = query.eq("week", week);

    const { data: rows, error } = await query;
    if (error) throw error;
    return NextResponse.json({ snapshots: rows || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load player snapshots." },
      { status: 500 }
    );
  }
}
