import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DraftPickAsset, ImportedLeague, LeagueTeam, LeagueType } from "@/lib/types";

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
  settings?: { type?: number; taxi_slots?: number; draft_rounds?: number; [key: string]: unknown };
};
type SleeperRoster = { roster_id: number; owner_id: string | null; players?: string[] | null; starters?: string[] | null; reserve?: string[] | null; taxi?: string[] | null; settings?: { wins?: number; losses?: number; ties?: number; fpts?: number; fpts_decimal?: number; fpts_against?: number; fpts_against_decimal?: number } };
type SleeperTradedPick = { season: string; round: number; roster_id: number; previous_owner_id?: number; owner_id: number };
type SleeperDraft = { season: string; status: string; settings?: { rounds?: number }; slot_to_roster_id?: Record<string, number | string> | null };

function decimalPoints(base = 0, decimal = 0) {
  return base + decimal / 100;
}

function leagueTypeFor(league: SleeperLeague): LeagueType {
  if (league.settings?.type === 2 || Number(league.settings?.taxi_slots || 0) > 0 || /dynasty/i.test(league.name)) return "dynasty";
  if (league.settings?.type === 1 || /keeper/i.test(league.name)) return "keeper";
  return "redraft";
}

function slotForOriginalRoster(drafts: SleeperDraft[], season: string, rosterId: number) {
  const draft = drafts.find((item) => String(item.season) === season && item.slot_to_roster_id);
  if (!draft?.slot_to_roster_id) return null;
  const match = Object.entries(draft.slot_to_roster_id).find(([, value]) => Number(value) === rosterId);
  return match ? Number(match[0]) : null;
}

function buildDraftPicks(league: SleeperLeague, teams: LeagueTeam[], traded: SleeperTradedPick[], drafts: SleeperDraft[]): DraftPickAsset[] {
  const type = leagueTypeFor(league);
  if (type === "redraft") return [];
  const current = Number(league.season);
  const currentDrafts = drafts.filter((draft) => Number(draft.season) === current);
  const hasOpenCurrentDraft = currentDrafts.some((draft) => draft.status !== "complete");
  const currentDraftIsComplete = currentDrafts.length > 0 && currentDrafts.every((draft) => draft.status === "complete");
  const includeCurrent = hasOpenCurrentDraft || (league.status === "pre_draft" && !currentDraftIsComplete);
  const start = includeCurrent ? current : current + 1;
  const seasons = new Set([String(start), String(start + 1), String(start + 2)]);
  traded.forEach((pick) => { if (Number(pick.season) >= current) seasons.add(String(pick.season)); });
  const configuredRounds = Number(league.settings?.draft_rounds || drafts.find((draft) => Number(draft.settings?.rounds) > 0)?.settings?.rounds || 4);
  const highestTradedRound = traded.reduce((highest, pick) => Math.max(highest, Number(pick.round) || 0), 0);
  const roundCount = Math.max(1, Math.min(8, Math.max(configuredRounds, highestTradedRound)));
  const tradedMap = new Map(traded.map((pick) => [`${pick.season}:${pick.round}:${pick.roster_id}`, pick]));
  const teamNames = new Map(teams.map((team) => [team.rosterId, team.teamName]));
  const assets: DraftPickAsset[] = [];
  [...seasons].sort().forEach((season) => {
    teams.forEach((team) => {
      for (let round = 1; round <= roundCount; round += 1) {
        const changed = tradedMap.get(`${season}:${round}:${team.rosterId}`);
        assets.push({
          id: `sleeper:${league.league_id}:${season}:${round}:${team.rosterId}`,
          provider: "sleeper",
          season,
          round,
          originalRosterId: team.rosterId,
          ownerRosterId: changed?.owner_id ?? team.rosterId,
          previousOwnerRosterId: changed?.previous_owner_id ?? null,
          originalTeamName: teamNames.get(team.rosterId) || null,
          draftSlot: slotForOriginalRoster(drafts, season, team.rosterId)
        });
      }
    });
  });
  return assets;
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();
  const season = request.nextUrl.searchParams.get("season")?.trim() || String(new Date().getFullYear());
  if (!username) return NextResponse.json({ error: "A Sleeper username is required." }, { status: 400 });
  if (username.length > 80) return NextResponse.json({ error: "Sleeper username is too long." }, { status: 400 });
  if (!/^\d{4}$/.test(season)) return NextResponse.json({ error: "Season must be a four-digit year." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Sign in before connecting Sleeper." }, { status: 401 });

    const user = await sleeperFetch<SleeperUser | null>(`/user/${encodeURIComponent(username)}`);
    if (!user?.user_id) return NextResponse.json({ error: "Sleeper user not found." }, { status: 404 });

    const leagues = await sleeperFetch<SleeperLeague[]>(`/user/${user.user_id}/leagues/nfl/${season}`);
    const normalized: ImportedLeague[] = await Promise.all(leagues.map(async (league) => {
      const type = leagueTypeFor(league);
      const [rosters, users, tradedPicks, drafts] = await Promise.all([
        sleeperFetch<SleeperRoster[]>(`/league/${league.league_id}/rosters`),
        sleeperFetch<SleeperUser[]>(`/league/${league.league_id}/users`),
        type === "redraft" ? Promise.resolve([] as SleeperTradedPick[]) : sleeperFetch<SleeperTradedPick[]>(`/league/${league.league_id}/traded_picks`).catch(() => []),
        type === "redraft" ? Promise.resolve([] as SleeperDraft[]) : sleeperFetch<SleeperDraft[]>(`/league/${league.league_id}/drafts`).catch(() => [])
      ]);
      const userMap = new Map(users.map((item) => [item.user_id, item]));
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
          starters: roster.starters || [],
          reserve: roster.reserve || [],
          taxi: roster.taxi || []
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
        leagueType: type,
        draftPicks: buildDraftPicks(league, teams, tradedPicks, drafts),
        teams
      };
    }));

    const { error: accountError } = await supabase.from("connected_accounts").upsert({
      user_id: authData.user.id,
      provider: "sleeper",
      provider_user_id: user.user_id,
      provider_username: user.username
    }, { onConflict: "user_id,provider,provider_user_id" });
    if (accountError) throw accountError;

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
