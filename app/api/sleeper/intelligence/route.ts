import {getUserEntitlement} from "@/lib/billing/entitlements";
import {buildPersonalizedPlayerRecommendations} from "@/lib/player-intelligence";
import type {ImportedLeague,PlayerIntelligencePayload} from "@/lib/types";
import {createHash} from 'node:crypto';
import { after, NextRequest, NextResponse } from "next/server";
import { syncSleeperPlayerIntelligence, type SleeperLeagueRecord } from "@/lib/sleeper/intelligence-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Pending work only, never a shared cache of completed customer responses.
const pending=new Map<string,Promise<PlayerIntelligencePayload>>();

export async function POST(request: NextRequest) {
  const started=performance.now();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const authenticatedAt=performance.now();
    if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = await request.json().catch(() => ({})) as { leagueId?: string; rosterId?: number; mode?: string };
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

    const leagueLoadedAt=performance.now();
    const signature=createHash('sha256').update(JSON.stringify(leagueRecord.raw_data)).digest('hex');
    const key=`${data.user.id}:${leagueId}:${body.mode==='dashboard'?'dashboard':'full'}:${signature}`;
    let work=pending.get(key);
    if(!work){work=syncSleeperPlayerIntelligence({
      leagueRecord: leagueRecord as SleeperLeagueRecord,
      backfillLimit: 3,
      ...(body.mode==='dashboard'?{deferPersistence:(work:()=>Promise<void>)=>after(async()=>{try{await work();}catch{console.warn('Deferred snapshot persistence unavailable.');}})}:{})
    });
    if(pending.size<100){pending.set(key,work);void work.finally(()=>{if(pending.get(key)===work)pending.delete(key);}).catch(()=>{});}}
    const [intelligence,entitlement] = await Promise.all([work,getUserEntitlement(supabase,data.user.id)]);
    const analyzedAt=performance.now();
    const league = intelligence.currentLeague || leagueRecord.raw_data as ImportedLeague;
    const selectedId = body.rosterId ?? league.userRosterId;
    const team = league.teams.find(t => t.rosterId === selectedId) ?? league.teams[0];
    const pro = entitlement.allAccess || entitlement.tradeLabAccess;
    const moves = team && intelligence.activeSeason !== false && intelligence.rostersSyncedAt && intelligence.currentSnapshots.some(s=>team.players.includes(s.playerId) && s.projectedPoints != null) ? buildPersonalizedPlayerRecommendations(league,team,intelligence) : [];
    const finished=performance.now();
    const timing={authMs:Math.round(authenticatedAt-started),leagueMs:Math.round(leagueLoadedAt-authenticatedAt),sourcesMs:Math.round(analyzedAt-leagueLoadedAt),recommendationsMs:Math.round(finished-analyzedAt),totalMs:Math.round(finished-started)};
    if(body.mode==='dashboard')console.info(JSON.stringify({event:'dashboard_analysis_timing',...timing}));
    return NextResponse.json({...intelligence, nextMoves: pro ? moves : moves.slice(0,1), pro}, {headers:{"Cache-Control":"private, no-store","Server-Timing":`auth;dur=${timing.authMs}, league;dur=${timing.leagueMs}, sources;dur=${timing.sourcesMs}, recommendations;dur=${timing.recommendationsMs}, total;dur=${timing.totalMs}`}});
  } catch (error) {
    return NextResponse.json(
      { error: "We couldn’t refresh player analysis. Your league connection is intact. Try again shortly." },
      { status: 500 }
    );
  }
}
