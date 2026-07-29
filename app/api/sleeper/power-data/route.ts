import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { WeeklyTeamScore } from "@/lib/types";

const API = "https://api.sleeper.app/v1";
const MAX_WEEK = 18;

type SleeperLeague = {
  league_id: string;
  season: string;
  status: string;
  settings?: { last_scored_leg?: number; playoff_week_start?: number };
};

type SleeperState = {
  season: string;
  season_type: string;
  week: number;
};

type SleeperMatchup = {
  roster_id: number;
  matchup_id?: number | null;
  points?: number | null;
  custom_points?: number | null;
};

async function sleeperFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`Sleeper power data request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

function completedWeekFor(league: SleeperLeague, state: SleeperState) {
  const lastScored = Number(league.settings?.last_scored_leg || 0);
  if (lastScored > 0) return Math.min(MAX_WEEK, lastScored);
  if (league.status === "complete") return MAX_WEEK;
  if (league.status === "pre_draft" || league.status === "drafting") return 0;
  if (state.season !== league.season) return MAX_WEEK;
  return Math.max(0, Math.min(MAX_WEEK, Number(state.week || 0) - 1));
}

export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get("leagueId")?.trim();
  if (!leagueId) return NextResponse.json({ error: "A Sleeper league ID is required." }, { status: 400 });
  if (!/^\d{8,24}$/.test(leagueId)) return NextResponse.json({ error: "The Sleeper league ID is invalid." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const [league, state] = await Promise.all([
      sleeperFetch<SleeperLeague>(`/league/${leagueId}`),
      sleeperFetch<SleeperState>("/state/nfl")
    ]);
    const completedWeek = completedWeekFor(league, state);
    if (!completedWeek) return NextResponse.json({ weeklyScores: [], completedWeek: 0 });

    const weeks = await Promise.all(
      Array.from({ length: completedWeek }, (_, index) => index + 1).map(async (week) => {
        const matchups = await sleeperFetch<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`).catch(() => []);
        return matchups.map((matchup): WeeklyTeamScore => ({
          week,
          rosterId: matchup.roster_id,
          matchupId: matchup.matchup_id ?? null,
          points: Number(matchup.custom_points ?? matchup.points ?? 0)
        }));
      })
    );

    return NextResponse.json({
      weeklyScores: weeks.flat(),
      completedWeek
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load power ranking data." }, { status: 502 });
  }
}
