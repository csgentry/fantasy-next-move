import {getUserEntitlement} from "@/lib/billing/entitlements";
import {buildPersonalizedPlayerRecommendations} from "@/lib/player-intelligence";
import type {ImportedLeague} from "@/lib/types";
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

    const body = await request.json().catch(() => ({})) as { leagueId?: string; rosterId?: number };
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
    const league = intelligence.currentLeague || leagueRecord.raw_data as ImportedLeague;
    const selectedId = body.rosterId ?? league.userRosterId;
    const team = league.teams.find(t => t.rosterId === selectedId) ?? league.teams[0];
    const entitlement = await getUserEntitlement(supabase, data.user.id);
    const pro = entitlement.allAccess || entitlement.tradeLabAccess;
    const moves = team && intelligence.activeSeason !== false && intelligence.rostersSyncedAt ? buildPersonalizedPlayerRecommendations(league,team,intelligence) : [];
    return NextResponse.json({...intelligence, nextMoves: pro ? moves : moves.slice(0,1), pro}, {headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    return NextResponse.json(
      { error: "We couldn’t refresh player analysis. Your league connection is intact. Try again shortly." },
      { status: 500 }
    );
  }
}
