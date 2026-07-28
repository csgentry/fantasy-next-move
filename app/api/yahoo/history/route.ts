import { NextRequest, NextResponse } from "next/server";
import type { HistoricalSeason, LeagueHistoryPayload } from "@/lib/types";
import { getValidYahooToken } from "@/lib/yahoo/auth";
import { importYahooLeagueByKey } from "@/lib/yahoo/api";

const MAX_SEASONS = 15;

export async function GET(request: NextRequest) {
  const startingLeagueId = request.nextUrl.searchParams.get("leagueId")?.trim();
  if (!startingLeagueId) return NextResponse.json({ error: "A Yahoo league key is required." }, { status: 400 });

  try {
    const token = await getValidYahooToken();
    if (!token) return NextResponse.json({ error: "Reconnect Yahoo before importing history." }, { status: 401 });

    const seasons: HistoricalSeason[] = [];
    const warnings: string[] = [];
    const visited = new Set<string>();
    let leagueKey: string | null = startingLeagueId;

    while (leagueKey && seasons.length < MAX_SEASONS && !visited.has(leagueKey)) {
      visited.add(leagueKey);
      const league = await importYahooLeagueByKey(token, leagueKey);
      const ranked = [...league.teams].sort((a, b) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        return b.wins - a.wins || b.pointsFor - a.pointsFor;
      });
      const isComplete = league.status === "complete";
      const champion = isComplete ? ranked[0] ?? null : null;
      const runnerUp = isComplete ? ranked[1] ?? null : null;
      if (isComplete && !champion?.rank) warnings.push(`${league.season}: Yahoo did not expose a final playoff rank; standings order was used.`);
      if (!isComplete) warnings.push(`${league.season}: season is still active, so no champion was assigned.`);
      seasons.push({
        provider: "yahoo",
        leagueId: league.leagueId,
        leagueName: league.name,
        season: league.season,
        championOwnerId: champion?.ownerId ?? null,
        champion: champion?.ownerName ?? null,
        championTeam: champion?.teamName ?? null,
        runnerUpOwnerId: runnerUp?.ownerId ?? null,
        runnerUp: runnerUp?.ownerName ?? null,
        runnerUpTeam: runnerUp?.teamName ?? null,
        teams: league.teams
      });
      leagueKey = league.previousLeagueId || null;
    }

    const payload: LeagueHistoryPayload = {
      provider: "yahoo",
      currentLeagueId: startingLeagueId,
      seasons,
      warnings
    };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import Yahoo history." }, { status: 502 });
  }
}
