import { XMLParser } from "fast-xml-parser";
import type { ImportedLeague, LeagueTeam, PlayerProfile } from "@/lib/types";
import type { YahooToken } from "./auth";

const API = "https://fantasysports.yahooapis.com/fantasy/v2";
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true
});

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  const node = record(value);
  return text(node["#text"] ?? node["$text"] ?? "");
}

function numberValue(value: unknown) {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray<T = unknown>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function findNodes(root: unknown, key: string, results: UnknownRecord[] = []): UnknownRecord[] {
  if (Array.isArray(root)) {
    root.forEach((item) => findNodes(item, key, results));
    return results;
  }
  if (!root || typeof root !== "object") return results;
  for (const [entryKey, value] of Object.entries(root as UnknownRecord)) {
    if (entryKey === key) {
      asArray(value).forEach((item) => {
        const node = record(item);
        if (Object.keys(node).length) results.push(node);
      });
    }
    findNodes(value, key, results);
  }
  return results;
}


async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

function uniqueBy<T>(items: T[], selector: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = selector(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function yahooFantasyFetch(path: string, token: YahooToken) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: "application/xml"
    },
    cache: "no-store"
  });
  const body = await response.text();
  if (!response.ok) {
    const message = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(message || `Yahoo Fantasy request failed (${response.status}).`);
  }
  return parser.parse(body) as UnknownRecord;
}

export async function yahooUserInfo(token: YahooToken) {
  const response = await fetch("https://api.login.yahoo.com/openid/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ sub?: string; name?: string; nickname?: string; email?: string; picture?: string }>;
}

function leagueKeyFromTeamKey(teamKey: string) {
  const match = teamKey.match(/^(.+\.l\.\d+)\.t\.\d+$/);
  return match?.[1] ?? "";
}

function managerFromTeam(team: UnknownRecord) {
  const managers = findNodes(team.managers, "manager");
  const manager = managers[0] ?? {};
  return {
    ownerId: text(manager.guid) || null,
    ownerName: text(manager.nickname || manager.email) || "Yahoo Manager"
  };
}

function normalizeYahooPlayer(player: UnknownRecord): PlayerProfile & { starter: boolean } {
  const playerId = text(player.player_key || player.player_id);
  const fullName = text(record(player.name).full) || [text(record(player.name).first), text(record(player.name).last)].filter(Boolean).join(" ") || playerId;
  const selectedPosition = text(record(player.selected_position).position) || null;
  return {
    playerId,
    fullName,
    position: text(player.display_position || player.primary_position) || "—",
    team: text(player.editorial_team_abbr) || null,
    status: text(player.status) || null,
    selectedPosition,
    starter: !["BN", "IR", "IR+", "NA"].includes(selectedPosition || "")
  };
}

async function fetchRoster(teamKey: string, token: YahooToken) {
  const payload = await yahooFantasyFetch(`/team/${encodeURIComponent(teamKey)}/roster/players`, token);
  const players = uniqueBy(findNodes(payload, "player"), (player) => text(player.player_key || player.player_id));
  const profiles = players.map(normalizeYahooPlayer).filter((player) => player.playerId);
  return {
    players: profiles.map((player) => player.playerId),
    starters: profiles.filter((player) => player.starter).map((player) => player.playerId),
    playerProfiles: Object.fromEntries(profiles.map(({ starter: _starter, ...profile }) => [profile.playerId, profile]))
  };
}

function normalizeStandingTeam(team: UnknownRecord): LeagueTeam | null {
  const teamKey = text(team.team_key);
  if (!teamKey) return null;
  const standings = record(team.team_standings);
  const totals = record(standings.outcome_totals);
  const manager = managerFromTeam(team);
  return {
    rosterId: numberValue(team.team_id) || Number(teamKey.split(".t.")[1]) || 0,
    providerTeamKey: teamKey,
    ownerId: manager.ownerId,
    ownerName: manager.ownerName,
    teamName: text(team.name) || `Yahoo Team ${text(team.team_id)}`,
    wins: numberValue(totals.wins),
    losses: numberValue(totals.losses),
    ties: numberValue(totals.ties),
    pointsFor: numberValue(standings.points_for),
    pointsAgainst: numberValue(standings.points_against),
    rank: numberValue(standings.rank) || null,
    players: [],
    starters: [],
    playerProfiles: {}
  };
}

export async function importYahooSeason(token: YahooToken, season: string) {
  let teamsPayload = await yahooFantasyFetch(`/users;use_login=1/games;game_codes=nfl;seasons=${encodeURIComponent(season)}/teams`, token);
  let userTeamNodes = uniqueBy(findNodes(teamsPayload, "team"), (team) => text(team.team_key));
  if (!userTeamNodes.length && season === String(new Date().getFullYear())) {
    teamsPayload = await yahooFantasyFetch(`/users;use_login=1/games;game_keys=nfl/teams`, token);
    userTeamNodes = uniqueBy(findNodes(teamsPayload, "team"), (team) => text(team.team_key));
  }
  const userTeamKeys = new Set(userTeamNodes.map((team) => text(team.team_key)).filter(Boolean));
  const leagueKeys = uniqueBy(userTeamNodes.map((team) => leagueKeyFromTeamKey(text(team.team_key))).filter(Boolean), (item) => item);

  const leagues: ImportedLeague[] = [];
  for (const leagueKey of leagueKeys) {
    const leaguePayload = await yahooFantasyFetch(`/league/${encodeURIComponent(leagueKey)};out=settings,standings,teams`, token);
    const leagueNode = findNodes(leaguePayload, "league").find((node) => text(node.league_key) === leagueKey) ?? findNodes(leaguePayload, "league")[0] ?? {};
    const standingNodes = uniqueBy(findNodes(record(leagueNode).standings, "team"), (team) => text(team.team_key));
    const fallbackNodes = uniqueBy(findNodes(leaguePayload, "team"), (team) => text(team.team_key));
    const teamNodes = standingNodes.length ? standingNodes : fallbackNodes;
    const normalizedTeams = teamNodes.map(normalizeStandingTeam).filter((team): team is LeagueTeam => Boolean(team));

    await mapWithConcurrency(normalizedTeams, 4, async (team) => {
      if (!team.providerTeamKey) return;
      try {
        Object.assign(team, await fetchRoster(team.providerTeamKey, token));
      } catch {
        // Some archived leagues do not expose roster data. Standings remain usable.
      }
    });

    const userTeam = normalizedTeams.find((team) => team.providerTeamKey && userTeamKeys.has(team.providerTeamKey));
    const settings = record(leagueNode.settings);
    const rosterPositions = findNodes(settings, "roster_position").flatMap((node) => {
      const position = text(node.position);
      const count = Math.max(numberValue(node.count), 1);
      return position ? Array.from({ length: count }, () => position) : [];
    });

    const scoringSettings = Object.fromEntries(findNodes(settings, "stat").map((stat) => [text(stat.stat_id), numberValue(stat.value)]).filter(([statId]) => Boolean(statId)));
    const renewKey = text(leagueNode.renew);

    leagues.push({
      provider: "yahoo",
      leagueId: leagueKey,
      providerLeagueKey: leagueKey,
      name: text(leagueNode.name) || `Yahoo League ${leagueKey}`,
      season: text(leagueNode.season) || season,
      status: text(leagueNode.is_finished) === "1" ? "complete" : "active",
      totalRosters: numberValue(leagueNode.num_teams) || normalizedTeams.length,
      scoringSettings,
      rosterPositions,
      previousLeagueId: renewKey && renewKey !== "0" ? renewKey : null,
      userRosterId: userTeam?.rosterId ?? null,
      teams: normalizedTeams
    });
  }

  return leagues;
}

export async function importYahooLeagueByKey(token: YahooToken, leagueKey: string): Promise<ImportedLeague> {
  const leaguePayload = await yahooFantasyFetch(`/league/${encodeURIComponent(leagueKey)};out=settings,standings,teams`, token);
  const leagueNode = findNodes(leaguePayload, "league").find((node) => text(node.league_key) === leagueKey) ?? findNodes(leaguePayload, "league")[0] ?? {};
  const standingNodes = uniqueBy(findNodes(record(leagueNode).standings, "team"), (team) => text(team.team_key));
  const fallbackNodes = uniqueBy(findNodes(leaguePayload, "team"), (team) => text(team.team_key));
  const normalizedTeams = (standingNodes.length ? standingNodes : fallbackNodes).map(normalizeStandingTeam).filter((team): team is LeagueTeam => Boolean(team));
  const renewKey = text(leagueNode.renew);
  return {
    provider: "yahoo",
    leagueId: leagueKey,
    providerLeagueKey: leagueKey,
    name: text(leagueNode.name) || `Yahoo League ${leagueKey}`,
    season: text(leagueNode.season) || "",
    status: text(leagueNode.is_finished) === "1" ? "complete" : "active",
    totalRosters: numberValue(leagueNode.num_teams) || normalizedTeams.length,
    scoringSettings: {},
    rosterPositions: [],
    previousLeagueId: renewKey && renewKey !== "0" ? renewKey : null,
    userRosterId: null,
    teams: normalizedTeams
  };
}
