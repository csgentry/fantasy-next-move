import "server-only";
import {publicSleeperFeed} from './public-feed-cache';
import { sleeperAvatarUrl } from "../sleeper-avatar";

import { calculateFantasyScore } from "@/lib/fantasy-scoring";
import { calculateProjectionAccuracy } from "@/lib/player-intelligence";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ImportedLeague,
  NumericStatLine,
  PlayerIntelligencePayload,
  PlayerProfile,
  PlayerWeeklySnapshot,
  WeeklyTeamScore
} from "@/lib/types";

const SLEEPER_PUBLIC_API = "https://api.sleeper.app/v1";
const SLEEPER_DATA_API = "https://api.sleeper.com";
const MAX_WEEK = 18;
const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF", "DST", "DL", "DE", "DT", "LB", "DB", "CB", "S", "EDGE", "IDP"]);

type SleeperState = { season?: string; season_type?: string; week?: number };
type SleeperLeague = {
  league_id?: string;
  season?: string;
  status?: string;
  season_type?: string;
  scoring_settings?: Record<string, number>;
  roster_positions?: string[];
  settings?: { last_scored_leg?: number; playoff_week_start?: number };
};
type SleeperMatchup = {
  roster_id?: number;
  matchup_id?: number | null;
  points?: number | null;
  custom_points?: number | null;
};
type SleeperPlayerRecord = {
  player_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  fantasy_positions?: string[];
  team?: string | null;
  status?: string | null;
  injury_status?: string | null;
  practice_participation?: string | null;
  depth_chart_position?: number | null;
  age?: number | null;
  years_exp?: number | null;
  search_rank?: number | null;
};
type SleeperDataRow = {
  player_id?: string;
  player?: SleeperPlayerRecord;
  stats?: Record<string, unknown>;
  [key: string]: unknown;
};
export type SleeperLeagueRecord = {
  id: string;
  user_id: string;
  provider_league_id: string;
  raw_data: ImportedLeague;
};
type SyncOptions = { leagueRecord: SleeperLeagueRecord; backfillLimit?: number; deferPersistence?: (work:()=>Promise<void>)=>void };

function numberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function numericStats(value: unknown): NumericStatLine {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, Number(item)] as const)
      .filter(([, item]) => Number.isFinite(item))
  );
}

function asRows(payload: unknown): Array<{ key: string | null; row: SleeperDataRow }> {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is SleeperDataRow => Boolean(item) && typeof item === "object")
      .map((row) => ({ key: null, row }));
  }
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) return asRows(record.data);
  return Object.entries(record)
    .filter(([, item]) => Boolean(item) && typeof item === "object")
    .map(([key, item]) => ({ key, row: item as SleeperDataRow }));
}

function normalizeDataFeed(payload: unknown) {
  const result = new Map<string, { stats: NumericStatLine; player: SleeperPlayerRecord | null }>();
  asRows(payload).forEach(({ key, row }) => {
    const playerId = String(row.player_id || row.player?.player_id || key || "").trim();
    if (!playerId) return;
    const candidateStats = row.stats && typeof row.stats === "object" ? row.stats : row;
    const stats = numericStats(candidateStats);
    delete stats.player_id;
    result.set(playerId, { stats, player: row.player || null });
  });
  return result;
}

function fullName(playerId: string, player: SleeperPlayerRecord | undefined | null) {
  const combined = [player?.first_name, player?.last_name].filter(Boolean).join(" ").trim();
  return player?.full_name?.trim() || combined || playerId;
}

function normalizePosition(playerId: string, player: SleeperPlayerRecord | undefined | null) {
  const raw = player?.position || player?.fantasy_positions?.[0] || (/^[A-Z]{2,3}$/.test(playerId) ? "DEF" : "—");
  const position = String(raw).toUpperCase();
  return position === "D/ST" || position === "DST" ? "DEF" : position;
}

function toProfile(playerId: string, player: SleeperPlayerRecord | undefined | null): PlayerProfile {
  return {
    playerId,
    fullName: fullName(playerId, player),
    position: normalizePosition(playerId, player),
    team: player?.team || null,
    status: player?.status || player?.injury_status || null,
    age: player?.age == null ? null : numberValue(player.age),
    yearsExperience: player?.years_exp == null ? null : numberValue(player.years_exp),
    searchRank: player?.search_rank == null ? null : numberValue(player.search_rank),
    depthChartPosition: player?.depth_chart_position == null ? null : numberValue(player.depth_chart_position),
    injuryStatus: player?.injury_status || null,
    practiceParticipation: player?.practice_participation || null
  };
}

async function sleeperFetch<T>(url: string, revalidate: number, optional = false): Promise<T | null> {
  try {
    if(url.includes('/players/nfl?')||url.startsWith(`${SLEEPER_DATA_API}/projections/`)||url.startsWith(`${SLEEPER_DATA_API}/stats/`))return await publicSleeperFeed<T>(url,revalidate);
    const response = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      if (optional && [400, 404, 422].includes(response.status)) return null;
      throw new Error(`Sleeper request failed (${response.status}).`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (optional) return null;
    throw error;
  }
}

function rosterLookup(league: ImportedLeague) {
  const lookup = new Map<string, { rosterId: number; starter: boolean }>();
  league.teams.forEach((team) => {
    team.players.forEach((playerId) => lookup.set(playerId, {
      rosterId: team.rosterId,
      starter: team.starters.includes(playerId)
    }));
  });
  return lookup;
}

function determineWeeks(league: ImportedLeague, leagueMeta: SleeperLeague | null, state: SleeperState | null) {
  const season = Number(league.season);
  const stateSeason = Number(state?.season || 0);
  const stateWeek = Math.max(0, Math.min(MAX_WEEK, numberValue(state?.week)));
  const lastScored = Math.max(0, Math.min(MAX_WEEK, numberValue(leagueMeta?.settings?.last_scored_leg)));
  const status = String(leagueMeta?.status || league.status || "").toLowerCase();
  const rawSeasonType = String(leagueMeta?.season_type || state?.season_type || "regular").toLowerCase();
  const seasonType = rawSeasonType === "off" || rawSeasonType === "pre" ? "regular" : rawSeasonType;

  let latestCompletedWeek = lastScored;
  let projectionWeek = 1;
  if (stateSeason === season) {
    if (rawSeasonType === "regular") {
      projectionWeek = Math.max(1, stateWeek || lastScored + 1 || 1);
      latestCompletedWeek = Math.max(lastScored, Math.max(0, projectionWeek - 1));
    } else if (rawSeasonType === "post") {
      projectionWeek = Math.max(1, Math.min(MAX_WEEK, stateWeek || lastScored || MAX_WEEK));
      latestCompletedWeek = Math.max(lastScored, projectionWeek);
    }
  } else if (stateSeason > season || status === "complete") {
    latestCompletedWeek = lastScored || MAX_WEEK;
    projectionWeek = Math.max(1, latestCompletedWeek);
  }
  return {
    season,
    seasonType,
    projectionWeek: Math.max(1, Math.min(MAX_WEEK, projectionWeek)),
    latestCompletedWeek: Math.max(0, Math.min(MAX_WEEK, latestCompletedWeek))
  };
}

async function weeklyScores(leagueId: string, completedWeek: number, currentOnly=false) {
  if (!completedWeek) return [] as WeeklyTeamScore[];
  const weeks = await Promise.all(
    (currentOnly?[completedWeek]:Array.from({ length: completedWeek }, (_, index) => index + 1)).map(async (week) => {
      const payload = await sleeperFetch<SleeperMatchup[]>(
        `${SLEEPER_PUBLIC_API}/league/${encodeURIComponent(leagueId)}/matchups/${week}`,
        300,
        true
      );
      return (Array.isArray(payload) ? payload : [])
        .filter((row) => Number.isInteger(Number(row.roster_id)) && typeof (row.custom_points ?? row.points) === "number" && Number.isFinite(row.custom_points ?? row.points))
        .map((row) => ({
          week,
          rosterId: Number(row.roster_id),
          matchupId: row.matchup_id == null ? null : Number(row.matchup_id),
          points: numberValue(row.custom_points ?? row.points)
        } satisfies WeeklyTeamScore));
    })
  );
  return weeks.flat();
}

function rowForSnapshot(
  userId: string,
  leagueRecord: SleeperLeagueRecord,
  week: number,
  seasonType: string,
  playerId: string,
  profile: PlayerProfile,
  projectionStats: NumericStatLine,
  actualStats: NumericStatLine,
  projectedPoints: number | null,
  actualPoints: number | null,
  roster: { rosterId: number; starter: boolean } | undefined
) {
  const projectionError = projectedPoints == null || actualPoints == null
    ? null
    : Math.round((actualPoints - projectedPoints) * 100) / 100;
  return {
    user_id: userId,
    league_id: leagueRecord.id,
    provider_league_id: leagueRecord.provider_league_id,
    season: Number(leagueRecord.raw_data.season),
    week,
    season_type: seasonType,
    player_id: playerId,
    player_name: profile.fullName,
    position: profile.position,
    nfl_team: profile.team,
    roster_id: roster?.rosterId ?? null,
    is_rostered: Boolean(roster),
    is_starter: roster?.starter ?? false,
    projection_stats: projectionStats,
    actual_stats: actualStats,
    projected_points: projectedPoints,
    actual_points: actualPoints,
    projection_error: projectionError,
    absolute_error: projectionError == null ? null : Math.abs(projectionError),
    synced_at: new Date().toISOString()
  };
}

type SnapshotRow = ReturnType<typeof rowForSnapshot>;

function compactSnapshot(row: SnapshotRow): PlayerWeeklySnapshot {
  return {
    playerId: row.player_id,
    playerName: row.player_name,
    season: row.season,
    week: row.week,
    seasonType: row.season_type,
    position: row.position,
    nflTeam: row.nfl_team,
    rosterId: row.roster_id,
    rostered: row.is_rostered,
    starter: row.is_starter,
    projectionStats: row.projection_stats,
    actualStats: row.actual_stats,
    projectedPoints: row.projected_points,
    actualPoints: row.actual_points,
    projectionError: row.projection_error,
    absoluteError: row.absolute_error,
    syncedAt: row.synced_at
  };
}

async function buildWeekRows(
  userId: string,
  leagueRecord: SleeperLeagueRecord,
  week: number,
  seasonType: string,
  playerMap: Record<string, SleeperPlayerRecord>,
  projectionsPayload: unknown,
  statsPayload: unknown
) {
  const league = leagueRecord.raw_data;
  const projections = normalizeDataFeed(projectionsPayload);
  const actuals = normalizeDataFeed(statsPayload);
  const roster = rosterLookup(league);
  const ids = new Set<string>([...roster.keys(), ...projections.keys(), ...actuals.keys()]);
  const rows: SnapshotRow[] = [];
  const profiles: Record<string, PlayerProfile> = {};

  ids.forEach((playerId) => {
    const feedPlayer = projections.get(playerId)?.player || actuals.get(playerId)?.player;
    const player = feedPlayer || playerMap[playerId] || null;
    const profile = toProfile(playerId, player);
    const position = normalizePosition(playerId, player);
    if (!roster.has(playerId) && position !== "—" && !FANTASY_POSITIONS.has(position)) return;
    if (!roster.has(playerId) && position === "—") return;

    const projectionStats = projections.get(playerId)?.stats || {};
    const actualStats = actuals.get(playerId)?.stats || {};
    const projectedPoints = Object.keys(projectionStats).length
      ? calculateFantasyScore(projectionStats, league.scoringSettings, profile.position).total
      : null;
    const actualPoints = Object.keys(actualStats).length
      ? calculateFantasyScore(actualStats, league.scoringSettings, profile.position).total
      : null;
    if (!roster.has(playerId) && projectedPoints == null && actualPoints == null) return;
    profiles[playerId] = profile;
    rows.push(rowForSnapshot(
      userId,
      leagueRecord,
      week,
      seasonType,
      playerId,
      profile,
      projectionStats,
      actualStats,
      projectedPoints,
      actualPoints,
      roster.get(playerId)
    ));
  });
  return { rows, profiles };
}

async function upsertRows(rows: SnapshotRow[]): Promise<"saved" | "migration-required" | "unavailable"> {
  if (!rows.length) return "saved";
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  for (let index = 0; index < rows.length; index += 250) {
    const { error } = await admin
      .from("player_weekly_snapshots")
      .upsert(rows.slice(index, index + 250), {
        onConflict: "user_id,provider_league_id,season,week,player_id"
      });
    if (error) {
      if (error.code === "42P01" || error.message.toLowerCase().includes("does not exist")) return "migration-required";
      return "unavailable";
    }
  }
  return "saved";
}

async function storedWeeks(userId: string, leagueRecord: SleeperLeagueRecord) {
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data, error } = await admin
    .from("player_weekly_snapshots")
    .select("week")
    .eq("user_id", userId)
    .eq("provider_league_id", leagueRecord.provider_league_id)
    .eq("season", Number(leagueRecord.raw_data.season));
  if (error) return [] as number[];
  const rows = (data || []) as Array<{ week: number | string }>;
  return [...new Set<number>(rows.map((row) => Number(row.week)).filter((week) => Number.isFinite(week)))].sort((a, b) => a - b);
}

function returnableRows(rows: SnapshotRow[], rosteredIds: Set<string>) {
  const ranked = [...rows].sort((a, b) => (b.projected_points || b.actual_points || 0) - (a.projected_points || a.actual_points || 0));
  const allowed = new Set([...ranked.slice(0, 350).map((row) => row.player_id), ...rosteredIds]);
  return ranked.filter((row) => allowed.has(row.player_id)).map(compactSnapshot);
}

export async function syncSleeperPlayerIntelligence({
  leagueRecord,
  backfillLimit = 3,
  deferPersistence
}: SyncOptions): Promise<PlayerIntelligencePayload> {
  let league = leagueRecord.raw_data;
  const warnings: string[] = [];
  const rosterRequest=sleeperFetch<Array<{roster_id:number;owner_id:string|null;players?:string[];starters?:string[];reserve?:string[];taxi?:string[];settings?:{wins?:number;losses?:number;ties?:number;fpts?:number;fpts_decimal?:number;fpts_against?:number;fpts_against_decimal?:number}}>>(`${SLEEPER_PUBLIC_API}/league/${encodeURIComponent(league.leagueId)}/rosters`, 0, true);
  const [state, leagueMeta, playerMapPayload, leagueUsers, rosters] = await Promise.all([
    sleeperFetch<SleeperState>(`${SLEEPER_PUBLIC_API}/state/nfl`, 120),
    sleeperFetch<SleeperLeague>(`${SLEEPER_PUBLIC_API}/league/${encodeURIComponent(league.leagueId)}`, 300),
    sleeperFetch<Record<string, SleeperPlayerRecord>>(`${SLEEPER_PUBLIC_API}/players/nfl?active=true`, 300),
    sleeperFetch<Array<{user_id:string;avatar?:string|null;metadata?:{avatar?:string}}>>(`${SLEEPER_PUBLIC_API}/league/${encodeURIComponent(league.leagueId)}/users`, 300).catch(() => null),
    rosterRequest
  ]);
  // Refresh ownership before any waiver or trade advice. Never infer availability from saved rosters.
  const rosterIds = new Set(Array.isArray(rosters) ? rosters.map(r=>r.roster_id) : []);
  const ownershipVerified = Array.isArray(rosters) && rosters.length === league.teams.length && rosterIds.size === league.teams.length && league.teams.every(t=>rosterIds.has(t.rosterId)) && rosters.every(r=>[r.players,r.starters,r.reserve,r.taxi].every(value=>value==null || (Array.isArray(value)&&value.every(id=>typeof id==="string"))));
  if (ownershipVerified) {
    league = {...league, scoringSettings:leagueMeta?.scoring_settings || league.scoringSettings, rosterPositions:leagueMeta?.roster_positions || league.rosterPositions, teams:league.teams.map(team=>{
      const r=rosters!.find(r=>r.roster_id===team.rosterId)!;
      const sameOwner=r.owner_id===team.ownerId;
      const owner=Array.isArray(leagueUsers)?leagueUsers.find(user=>user.user_id===r.owner_id):undefined;
      const ownerAvatarUrl=owner?sleeperAvatarUrl(owner.avatar):sameOwner?team.ownerAvatarUrl:null;
      const avatarUrl=owner?sleeperAvatarUrl(owner.metadata?.avatar)||ownerAvatarUrl:sameOwner?team.avatarUrl:null;
      return {...team, avatarUrl, ownerAvatarUrl, ownerId:r.owner_id, ownerName:sameOwner?team.ownerName:`Roster ${r.roster_id}`,teamName:sameOwner?team.teamName:`Team ${r.roster_id}`,players:r.players||[],starters:r.starters||[],reserve:r.reserve||[],taxi:r.taxi||[],wins:r.settings?.wins??team.wins,losses:r.settings?.losses??team.losses,ties:r.settings?.ties??team.ties,pointsFor:r.settings?.fpts===undefined?team.pointsFor:r.settings.fpts+(r.settings.fpts_decimal||0)/100,pointsAgainst:r.settings?.fpts_against===undefined?team.pointsAgainst:r.settings.fpts_against+(r.settings.fpts_against_decimal||0)/100};
    })};
    leagueRecord={...leagueRecord,raw_data:league};
  } else warnings.push("Current roster ownership could not be verified. Waiver availability is withheld; reconnect before acting.");
  const playerMap = playerMapPayload || {};
  const weeks = determineWeeks(league, leagueMeta, state);
  const existingWeeks = deferPersistence ? [] : await storedWeeks(leagueRecord.user_id, leagueRecord);
  const missingCompleted = Array.from({ length: weeks.latestCompletedWeek }, (_, index) => index + 1)
    .filter((week) => !existingWeeks.includes(week));
  const backfillWeeks = deferPersistence || backfillLimit<=0 ? [] : missingCompleted.slice(-backfillLimit);
  const requestedWeeks = [...new Set([...backfillWeeks, weeks.projectionWeek,...(weeks.latestCompletedWeek?[weeks.latestCompletedWeek]:[])])].sort((a, b) => a - b);
  const weekResults = new Map<number, { rows: SnapshotRow[]; profiles: Record<string, PlayerProfile> }>();
  let storageStatus: "saved" | "migration-required" | "unavailable" = "saved";

  const currentMatchupsRequest=weeklyScores(league.leagueId,weeks.projectionWeek,true);
  const historicalScoresRequest=deferPersistence?Promise.resolve([]):weeklyScores(league.leagueId,weeks.latestCompletedWeek);
  await Promise.all(requestedWeeks.map(async week => {
    const [projectionPayload, actualPayload] = await Promise.all([
      sleeperFetch<unknown>(
        `${SLEEPER_DATA_API}/projections/nfl/${weeks.season}/${week}?season_type=${encodeURIComponent(weeks.seasonType)}`,
        week === weeks.projectionWeek ? 300 : 86400,
        true
      ),
      week <= weeks.latestCompletedWeek
        ? sleeperFetch<unknown>(
            `${SLEEPER_DATA_API}/stats/nfl/${weeks.season}/${week}?season_type=${encodeURIComponent(weeks.seasonType)}`,
            900,
            true
          )
        : Promise.resolve(null)
    ]);
    if (!projectionPayload) warnings.push(`Sleeper projections are not available for Week ${week} yet.`);
    if (week <= weeks.latestCompletedWeek && !actualPayload) warnings.push(`Sleeper actual stats are not available for Week ${week} yet.`);
    const result = await buildWeekRows(
      leagueRecord.user_id,
      leagueRecord,
      week,
      weeks.seasonType,
      playerMap,
      projectionPayload,
      actualPayload
    );
    weekResults.set(week, result);
    if(!deferPersistence){const status = await upsertRows(result.rows);if (status !== "saved") storageStatus = status;}
  }));
  if(deferPersistence)deferPersistence(async()=>{for(const result of weekResults.values())await upsertRows(result.rows);});

  const current = weekResults.get(weeks.projectionWeek) || await buildWeekRows(
    leagueRecord.user_id,
    leagueRecord,
    weeks.projectionWeek,
    weeks.seasonType,
    playerMap,
    null,
    null
  );
  const accuracyWeek = weeks.latestCompletedWeek;
  let accuracyResult = accuracyWeek ? weekResults.get(accuracyWeek) : undefined;
  if (accuracyWeek && !accuracyResult) {
    const [projectionPayload, actualPayload] = await Promise.all([
      sleeperFetch<unknown>(
        `${SLEEPER_DATA_API}/projections/nfl/${weeks.season}/${accuracyWeek}?season_type=${encodeURIComponent(weeks.seasonType)}`,
        86400,
        true
      ),
      sleeperFetch<unknown>(
        `${SLEEPER_DATA_API}/stats/nfl/${weeks.season}/${accuracyWeek}?season_type=${encodeURIComponent(weeks.seasonType)}`,
        900,
        true
      )
    ]);
    accuracyResult = await buildWeekRows(
      leagueRecord.user_id,
      leagueRecord,
      accuracyWeek,
      weeks.seasonType,
      playerMap,
      projectionPayload,
      actualPayload
    );
    const status = await upsertRows(accuracyResult.rows);
    if (status !== "saved") storageStatus = status;
  }

  const allProfiles: Record<string, PlayerProfile> = {};
  const rosteredIds = new Set(league.teams.flatMap((team) => team.players));
  Object.entries(playerMap).forEach(([playerId, player]) => {
    if (rosteredIds.has(playerId)) allProfiles[playerId] = toProfile(playerId, player);
  });
  Object.assign(allProfiles, current.profiles, accuracyResult?.profiles || {});

  const currentSnapshots = returnableRows(current.rows, rosteredIds);
  const accuracySnapshots = accuracyResult ? returnableRows(accuracyResult.rows, rosteredIds) : [];
  const priorMap = new Map(accuracySnapshots.map((snapshot) => [snapshot.playerId, snapshot]));
  currentSnapshots.forEach((snapshot) => {
    const prior = priorMap.get(snapshot.playerId);
    snapshot.previousProjectedPoints = prior?.projectedPoints ?? null;
    snapshot.previousActualPoints = prior?.actualPoints ?? null;
    snapshot.recentError = prior?.projectionError ?? null;
  });

  const [scores,currentMatchups] = await Promise.all([historicalScoresRequest,currentMatchupsRequest]);
  const savedWeeks = !deferPersistence && storageStatus === "saved"
    ? await storedWeeks(leagueRecord.user_id, leagueRecord)
    : [...new Set<number>([...existingWeeks, ...requestedWeeks])].sort((a, b) => a - b);

  return {
    provider: "sleeper",
    currentLeague: league,
    rostersSyncedAt: ownershipVerified ? new Date().toISOString() : null,
    activeSeason: Number(state?.season) === Number(league.season) && state?.season_type === "regular",
    currentMatchups,
    leagueId: league.leagueId,
    season: weeks.season,
    projectionWeek: weeks.projectionWeek,
    latestCompletedWeek: weeks.latestCompletedWeek,
    seasonType: weeks.seasonType,
    profiles: allProfiles,
    currentSnapshots,
    accuracySnapshots,
    weeklyScores: scores,
    accuracy: calculateProjectionAccuracy(accuracySnapshots, accuracyWeek || null),
    storedWeeks: savedWeeks,
    storageStatus: deferPersistence ? 'deferred' : storageStatus,
    syncedAt: new Date().toISOString(),
    warnings: [...new Set(warnings)]
  };
}
