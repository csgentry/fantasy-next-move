import { NextRequest, NextResponse } from "next/server";
import { syncSleeperPlayerIntelligence, type SleeperLeagueRecord } from "@/lib/sleeper/intelligence-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: leagues, error } = await admin
    .from("leagues")
    .select("id,user_id,provider_league_id,raw_data")
    .eq("provider", "sleeper")
    .eq("is_active", true)
    .order("synced_at", { ascending: false })
    .limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ leagueId: string; ok: boolean; warning?: string }> = [];
  for (const league of leagues || []) {
    try {
      const synced = await syncSleeperPlayerIntelligence({
        leagueRecord: league as SleeperLeagueRecord,
        backfillLimit: 1
      });
      results.push({
        leagueId: league.provider_league_id,
        ok: true,
        warning: synced.storageStatus === "saved" ? undefined : synced.storageStatus
      });
    } catch (syncError) {
      results.push({
        leagueId: league.provider_league_id,
        ok: false,
        warning: syncError instanceof Error ? syncError.message : "Sync failed."
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
