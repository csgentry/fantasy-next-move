import { NextRequest, NextResponse } from "next/server";
import type { ImportedLeague, LeagueTeam, LeagueType } from "@/lib/types";

const API = "https://api.sleeper.app/v1";

async function sleeperFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`Sleeper request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

type SleeperUser = { user_id: string; username: string; display_name: string; avatar: string | null; metadata?: Record<string, string> };
type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  scoring_settings?: Record<string, number>;
  roster_positions?: string[];
  previous_league_id?: string | null;
  settings?: { type?: number; taxi_slots?: number; [key: string]: unknown };
};
type SleeperRoster = { roster_id: number; owner_id: string | null; players?: string[] | null; starters?: string[] | null; settings?: { wins?: number; losses?: number; ties?: number; fpts?: number; fpts_decimal?: number; fpts_against?: number; fpts_against_decimal?: number } };

function decimalPoints(base = 0, decimal = 0) {
  return base + decimal / 100;
}

function leagueTypeFor(league: SleeperLeague): LeagueType {
  if (league.settings?.type === 2 || Number(league.settings?.taxi_slots || 0) > 0 || /dynasty/i.test(league.name)) return "dynasty";
  if (league.settings?.type === 1 || /keeper/i.test(league.name)) return "keeper";
  return "redraft";
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();
  const season = request.nextUrl.searchParams.get("season")?.trim() || "2026";
  if (!username) return NextResponse.json({ error: "A Sleeper username is required." }, { status: 400 });
  if (!/^\d{4}$/.test(season)) return NextResponse.json({ error: "Season must be a four-digit year." }, { status: 400 });

  try {
    const user = await sleeperFetch<SleeperUser | null>(`/user/${encodeURIComponent(username)}`);
    if (!user?.user_id) return NextResponse.json({ error: "Sleeper user not found." }, { status: 404 });

    const leagues = await sleeperFetch<SleeperLeague[]>(`/user/${user.user_id}/leagues/nfl/${season}`);
    const normalized: ImportedLeague[] = await Promise.all(leagues.map(async (league) => {
      const [rosters, users] = await Promise.all([
        sleeperFetch<SleeperRoster[]>(`/league/${league.league_id}/rosters`),
        sleeperFetch<SleeperUser[]>(`/league/${league.league_id}/users`)
      ]);
      const userMap = new Map(users.map((item) => [item.user_id, item]));
      const teams: LeagueTeam[] = rosters.map((roster) => {
        const owner = roster.owner_id ? userMap.get(roster.owner_id) : undefined;
        const pointsFor = decimalPoints(roster.settings?.fpts, roster.settings?.fpts_decimal);
        const pointsAgainst = decimalPoints(roster.settings?.fpts_against, roster.settings?.fpts_against_decimal);
        return {
          rosterId: roster.roster_id,
          ownerId: roster.owner_id,
          ownerName: owner?.display_name || owner?.username || `Roster ${roster.roster_id}`,
          teamName: owner?.metadata?.team_name || owner?.display_name || `Team ${roster.roster_id}`,
          wins: roster.settings?.wins || 0,
          losses: roster.settings?.losses || 0,
          ties: roster.settings?.ties || 0,
          pointsFor,
          pointsAgainst,
          players: roster.players || [],
          starters: roster.starters || []
        };
      });
      return {
        provider: "sleeper" as const,
        leagueId: league.league_id,
        name: league.name,
        season: league.season,
        status: league.status,
        totalRosters: league.total_rosters,
        scoringSettings: league.scoring_settings || {},
        rosterPositions: league.roster_positions || [],
        previousLeagueId: league.previous_league_id || null,
        userRosterId: teams.find((team) => team.ownerId === user.user_id)?.rosterId ?? null,
        leagueType: leagueTypeFor(league),
        teams
      };
    }));

    return NextResponse.json({
      provider: "sleeper",
      user: { userId: user.user_id, username: user.username, displayName: user.display_name, avatar: user.avatar },
      season,
      leagues: normalized
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reach Sleeper." }, { status: 502 });
  }
}
