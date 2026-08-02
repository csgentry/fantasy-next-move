import { NextRequest, NextResponse } from "next/server";
import { syncSleeperPlayerIntelligence, type SleeperLeagueRecord } from "@/lib/sleeper/intelligence-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = await request.json().catch(() => ({})) as { leagueId?: string };
    const leagueId = String(body.leagueId || "").trim();
    if (!/^\d{8,24}$/.test(leagueId)) {
      return NextResponse.json({ error: "A valid Sleeper league ID is required." }, { status: 400 });
    }

    const { data: leagueRecord, error } = await supabase
      .from("leagues")
      .select("id,user_id,provider_league_id,raw_data")
      .eq("user_id", data.user.id)
      .eq("provider", "sleeper")
      .eq("provider_league_id", leagueId)
      .maybeSingle();
    if (error) throw error;
    if (!leagueRecord) {
      return NextResponse.json({ error: "Connect and save this Sleeper league first." }, { status: 404 });
    }

    const intelligence = await syncSleeperPlayerIntelligence({
      leagueRecord: leagueRecord as SleeperLeagueRecord,
      backfillLimit: 3
    });
    return NextResponse.json(intelligence);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Sleeper player intelligence." },
      { status: 500 }
    );
  }
}
