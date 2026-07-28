import { NextRequest, NextResponse } from "next/server";
import type { HistoricalSeason, LeagueHistoryPayload, LeagueTeam } from "@/lib/types";

const API = "https://api.sleeper.app/v1";
const MAX_SEASONS = 15;

type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  previous_league_id?: string | null;
};
type SleeperUser = { user_id: string; username: string; display_name: string; metadata?: Record<string, string> };
type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  players?: string[] | null;
  starters?: string[] | null;
  settings?: { wins?: number; losses?: number; ties?: number; fpts?: number; fpts_decimal?: number; fpts_against?: number; fpts_against_decimal?: number };
};
type BracketMatch = { r?: number; m?: number; w?: number | null; l?: number | null };

async function sleeperFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Sleeper history request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

function decimalPoints(base = 0, decimal = 0) {
  return base + decimal / 100;
}

function championMatch(bracket: BracketMatch[]) {
  return [...bracket]
    .filter((match) => match.w != null && match.l != null)
    .sort((a, b) => (b.r ?? 0) - (a.r ?? 0) || (a.m ?? Number.MAX_SAFE_INTEGER) - (b.m ?? Number.MAX_SAFE_INTEGER))[0] ?? null;
}

export async function GET(request: NextRequest) {
  const startingLeagueId = request.nextUrl.searchParams.get("leagueId")?.trim();
  if (!startingLeagueId) return NextResponse.json({ error: "A Sleeper league ID is required." }, { status: 400 });

  const seasons: HistoricalSeason[] = [];
  const warnings: string[] = [];
  const visited = new Set<string>();
  let leagueId: string | null = startingLeagueId;

  try {
    while (leagueId && seasons.length < MAX_SEASONS && !visited.has(leagueId)) {
      visited.add(leagueId);
      const league: SleeperLeague = await sleeperFetch<SleeperLeague>(`/league/${leagueId}`);
      const [rosters, users, bracket] = await Promise.all([
        sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`),
        sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`),
        sleeperFetch<BracketMatch[]>(`/league/${leagueId}/winners_bracket`).catch(() => [])
      ]);
      const userMap = new Map(users.map((user) => [user.user_id, user]));
      const teams: LeagueTeam[] = rosters.map((roster) => {
        const owner = roster.owner_id ? userMap.get(roster.owner_id) : undefined;
        return {
          rosterId: roster.roster_id,
          ownerId: roster.owner_id,
          ownerName: owner?.display_name || owner?.username || `Roster ${roster.roster_id}`,
          teamName: owner?.metadata?.team_name || owner?.display_name || `Team ${roster.roster_id}`,
          wins: roster.settings?.wins || 0,
          losses: roster.settings?.losses || 0,
          ties: roster.settings?.ties || 0,
          pointsFor: decimalPoints(roster.settings?.fpts, roster.settings?.fpts_decimal),
          pointsAgainst: decimalPoints(roster.settings?.fpts_against, roster.settings?.fpts_against_decimal),
          players: roster.players || [],
          starters: roster.starters || []
        };
      });
      const final = championMatch(bracket);
      const championTeam = final?.w != null ? teams.find((team) => team.rosterId === final.w) : null;
      const runnerUpTeam = final?.l != null ? teams.find((team) => team.rosterId === final.l) : null;
      if (!final) warnings.push(`${league.season}: championship bracket was unavailable or incomplete.`);

      seasons.push({
        provider: "sleeper",
        leagueId: league.league_id,
        leagueName: league.name,
        season: league.season,
        championOwnerId: championTeam?.ownerId ?? null,
        champion: championTeam?.ownerName ?? null,
        championTeam: championTeam?.teamName ?? null,
        runnerUpOwnerId: runnerUpTeam?.ownerId ?? null,
        runnerUp: runnerUpTeam?.ownerName ?? null,
        runnerUpTeam: runnerUpTeam?.teamName ?? null,
        teams
      });
      leagueId = league.previous_league_id || null;
    }

    const payload: LeagueHistoryPayload = {
      provider: "sleeper",
      currentLeagueId: startingLeagueId,
      seasons,
      warnings
    };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import Sleeper history." }, { status: 502 });
  }
}
