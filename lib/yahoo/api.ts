import "server-only";
import { fetchWithBackoff } from "./retry";
import { XMLParser } from "fast-xml-parser";
import type { ImportedLeague, LeagueTeam, PlayerProfile } from "@/lib/types";
import type { YahooToken } from "./auth";

const API = "https://fantasysports.yahooapis.com/fantasy/v2";
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
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

function ageFromBirthDate(value: unknown) {
  const birthDate = text(value);
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - parsed.getUTCFullYear();
  const birthdayPassed = today.getUTCMonth() > parsed.getUTCMonth() || (today.getUTCMonth() === parsed.getUTCMonth() && today.getUTCDate() >= parsed.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age >= 18 && age <= 50 ? age : null;
}

function yahooLeagueType(settings: UnknownRecord) {
  const keeperFlag = text(settings.keeper || settings.is_keeper || settings.uses_keeper).toLowerCase();
  return ["1", "true", "yes"].includes(keeperFlag) ? "keeper" as const : "redraft" as const;
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


function uniqueBy<T>(items: T[], selector: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = selector(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const YAHOO_PROBLEMS = new Set(["invalid_token", "insufficient_scope", "token_expired", "token_rejected", "consumer_key_rejected", "consumer_key_unknown", "permission_denied", "signature_invalid", "nonce_used", "timestamp_refused"]);

async function yahooProblem(response: Response) {
  // Examine a bounded error response in memory. Never return or log raw bodies,
  // authorization headers, provider URLs, or arbitrary provider descriptions.
  let detail = (response.headers.get("www-authenticate") || "").slice(0, 8192);
  const reader = response.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let remaining = 8192;
    try {
      while (remaining > 0) {
        const {done, value} = await reader.read();
        if (done) break;
        const part = value.subarray(0, remaining);
        detail += decoder.decode(part, {stream: true});
        remaining -= part.byteLength;
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  const code = detail.match(/(?:oauth_problem|error)["']?\s*[:=]\s*["']?([a-z_]+)/i)?.[1]?.toLowerCase();
  return code && YAHOO_PROBLEMS.has(code) ? code : "unclassified";
}

export class YahooApiError extends Error {
  constructor(public readonly status: number, public readonly providerCode = "unclassified") {
    super(providerCode === "token_expired" ? "Yahoo authorization expired. Reconnect Yahoo." : status === 401 ? "Yahoo rejected this Fantasy Sports request. Reconnect Yahoo. If this continues, Fantasy Sports access needs verification." : status === 403 ? "Yahoo Fantasy access is not authorized for this application or account." : status === 429 ? "Yahoo is limiting requests. Wait before refreshing." : "Yahoo Fantasy is temporarily unavailable. Try again.");
    this.name = "YahooApiError";
  }
}

export async function yahooFantasyFetch(path: string, token: YahooToken) {
  const response = await fetchWithBackoff(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: "application/xml"
    },
    cache: "no-store"
  });
  if (!response.ok) throw new YahooApiError(response.status, await yahooProblem(response));
  const body = await response.text();
  return parser.parse(body) as UnknownRecord;
}

function leagueKeyFromTeamKey(teamKey: string) {
  const match = teamKey.match(/^(.+\.l\.\d+)\.t\.\d+$/);
  return match?.[1] ?? "";
}

function normalizeYahooPlayer(player: UnknownRecord): PlayerProfile & { starter: boolean } {
  const playerId = text(player.player_key);
  const fullName = text(record(player.name).full) || [text(record(player.name).first), text(record(player.name).last)].filter(Boolean).join(" ") || playerId;
  const selectedPosition = text(record(player.selected_position).position) || null;
  const explicitAge = numberValue(player.age);
  const experience = numberValue(player.experience || player.years_experience);
  return {
    playerId,
    fullName,
    position: text(player.display_position || player.primary_position) || "—",
    team: text(player.editorial_team_abbr) || null,
    status: text(player.status) || null,
    selectedPosition,
    eligiblePositions: asArray(record(player.eligible_positions).position).map(text).filter(Boolean),
    age: explicitAge || ageFromBirthDate(player.birth_date),
    yearsExperience: experience || null,
    searchRank: null,
    starter: Boolean(selectedPosition) && !["BN", "IR", "IR+", "NA"].includes(selectedPosition || "")
  };
}

async function fetchRoster(teamKey: string, token: YahooToken) {
  const payload = await yahooFantasyFetch(`/team/${encodeURIComponent(teamKey)}/roster/players`, token);
  const players = uniqueBy(findNodes(payload, "player"), (player) => text(player.player_key || player.player_id));
  const profiles = players.map(normalizeYahooPlayer).filter((player) => /^\d+\.p\.\d+$/.test(player.playerId));
  return {
    players: profiles.map((player) => player.playerId),
    starters: profiles.filter((player) => player.starter).map((player) => player.playerId),
    reserve: profiles.filter(player => ["IR", "IR+", "NA"].includes(player.selectedPosition || "")).map(player => player.playerId),
    playerProfiles: Object.fromEntries(profiles.map(({ starter: _starter, ...profile }) => [profile.playerId, profile]))
  };
}

export function currentYahooSeason(now = new Date()) {
  return String(now.getUTCFullYear() - (now.getUTCMonth() < 2 ? 1 : 0));
}

async function ownedTeams(token: YahooToken) {
  const payload = await yahooFantasyFetch(`/users;use_login=1/games;game_codes=nfl;seasons=${currentYahooSeason()}/teams`, token);
  return uniqueBy(findNodes(payload, "team"), team => text(team.team_key));
}

async function leagueMetadata(token: YahooToken, leagueKey: string, settings = false) {
  const payload = await yahooFantasyFetch(`/league/${encodeURIComponent(leagueKey)}${settings ? ";out=settings" : ""}`, token);
  const node = findNodes(payload, "league").find(item => text(item.league_key) === leagueKey);
  if (!node || text(node.season) !== currentYahooSeason()) throw new Error("Choose a current-season NFL league.");
  return node;
}

export async function discoverYahooLeagues(token: YahooToken, onWarning?: (message: string) => void) {
  const owned = await ownedTeams(token);
  const choices = [];
  let lastFailure: unknown;
  for (const team of owned) {
    const teamKey = text(team.team_key);
    const leagueKey = leagueKeyFromTeamKey(teamKey);
    if (!/^\d+\.l\.\d+$/.test(leagueKey)) continue;
    try {
      const node = await leagueMetadata(token, leagueKey);
      choices.push({leagueKey, teamKey, name: text(node.name) || "Yahoo league", teamName: text(team.name) || "My team", season: currentYahooSeason()});
    } catch (error) {
      if (error instanceof YahooApiError && [401, 403, 429].includes(error.status)) throw error;
      lastFailure = error;
      onWarning?.("One Yahoo league could not be loaded. Refresh to try again.");
    }
  }
  if (!choices.length && lastFailure) throw lastFailure;
  return choices;
}

export async function selectYahooLeague(token: YahooToken, leagueKey: string, teamKey: string): Promise<ImportedLeague> {
  if (!/^\d+\.l\.\d+$/.test(leagueKey) || !/^\d+\.l\.\d+\.t\.\d+$/.test(teamKey) || leagueKeyFromTeamKey(teamKey) !== leagueKey) throw new Error("Invalid league selection.");
  const owned = await ownedTeams(token);
  const teamNode = owned.find(team => text(team.team_key) === teamKey);
  if (!teamNode) throw new Error("This team is not owned by the connected Yahoo account.");
  const node = await leagueMetadata(token, leagueKey, true);
  const settings = record(node.settings);
  const rosterPositions = findNodes(settings, "roster_position").flatMap(item => Array.from({length: Math.min(Math.max(Math.floor(numberValue(item.count)), 0), 50)}, () => text(item.position))).filter(Boolean);
  const scoringModifiers = Object.fromEntries(findNodes(record(settings.stat_modifiers), "stat").flatMap(stat => {
    const id = text(stat.stat_id);
    const raw = text(stat.value);
    const value = Number(raw);
    return /^\d+$/.test(id) && raw !== "" && Number.isFinite(value) ? [[id, value]] : [];
  }));
  const roster = await fetchRoster(teamKey, token);
  const rosterId = Number(teamKey.split(".t.")[1]);
  const team: LeagueTeam = {rosterId, providerTeamKey: teamKey, ownerId: null, ownerName: "You", teamName: text(teamNode.name) || "My team", wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, rank: null, ...roster};
  return {provider: "yahoo", leagueId: leagueKey, providerLeagueKey: leagueKey, name: text(node.name) || "Yahoo league", season: currentYahooSeason(), status: text(node.is_finished) === "1" ? "complete" : "active", totalRosters: numberValue(node.num_teams), scoringSettings: {}, rosterPositions, previousLeagueId: null, userRosterId: rosterId, leagueType: yahooLeagueType(settings), teams: [team], providerContext: {
    provider: "yahoo", syncedAt: new Date().toISOString(),
    currentWeek: numberValue(node.current_week) || null, scoringModifiers,
    warnings: ["Only your authorized team roster is loaded. Opponent rosters and independent projections are unavailable.", "Yahoo scoring category identifiers are retained separately; they are not assumed to match another provider."]
  }};
}
