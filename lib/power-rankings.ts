import { tradeValueForPick } from "./trade-values";
import type {
  ImportedLeague,
  LeagueTeam,
  PlayerProfile,
  PlayerWeeklySnapshot,
  WeeklyTeamScore
} from "./types";

export type PowerLens = "overall" | "contender" | "dynasty";
export type PowerPosition = "QB" | "RB" | "WR" | "TE";
export type PowerConfidence = "High" | "Medium" | "Limited";

export type PositionMetric = {
  score: number;
  rank: number;
  grade: string;
};

export type PowerRankingTeam = LeagueTeam & {
  pointDiff: number;
  powerScore: number;
  overallScore: number;
  overallRank: number;
  contenderScore: number;
  contenderRank: number;
  dynastyScore: number;
  dynastyRank: number;
  starterScore: number;
  starterRank: number;
  benchScore: number;
  benchRank: number;
  positional: Record<PowerPosition, PositionMetric>;
  allPlayWins: number;
  allPlayLosses: number;
  allPlayTies: number;
  allPlayPct: number;
  expectedWins: number;
  luckRating: number;
  luckLabel: string;
  previousRank: number | null;
  movement: number | null;
  explanations: string[];
  confidence: PowerConfidence;
  playerCoverage: number;
  completedWeeks: number;
  projectedStarterPoints: number | null;
  projectionCoverage: number;
};

const POWER_POSITIONS: PowerPosition[] = ["QB", "RB", "WR", "TE"];
const FLEX_SLOTS = new Set(["FLEX", "W/R/T", "WRRB_FLEX", "REC_FLEX"]);
const SUPERFLEX_SLOTS = new Set(["SUPER_FLEX", "SF", "OP", "Q/W/R/T", "FLEX_QB"]);
const BENCH_SLOTS = new Set(["BN", "BENCH", "IR", "RESERVE", "TAXI"]);

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizePosition(position: string | null | undefined) {
  const first = (position || "—").split(/[,/]/)[0]?.trim().toUpperCase() || "—";
  return first === "D/ST" || first === "DST" ? "DEF" : first;
}

function isSuperflex(league: ImportedLeague) {
  return league.rosterPositions.some((position) => SUPERFLEX_SLOTS.has(position.toUpperCase()));
}

function isTightEndPremium(league: ImportedLeague) {
  return Object.entries(league.scoringSettings).some(([key, value]) => {
    const normalized = key.toLowerCase();
    return normalized.includes("te") && normalized.includes("rec") && Number(value) > 0;
  });
}

function statusPenalty(status: string | null | undefined, dynasty: boolean) {
  const normalized = (status || "").toLowerCase();
  if (!normalized || ["active", "healthy", "probable"].includes(normalized)) return 0;
  if (normalized.includes("out") || normalized.includes("ir") || normalized.includes("pup")) return dynasty ? -5 : -11;
  if (normalized.includes("doubtful")) return dynasty ? -3 : -7;
  if (normalized.includes("questionable")) return dynasty ? -1 : -3;
  return dynasty ? -1 : -2;
}

function ageAdjustment(position: string, age: number | null | undefined) {
  if (!age || age < 18 || age > 50) return 0;
  if (position === "QB") return age <= 26 ? 10 : age <= 30 ? 7 : age <= 33 ? 3 : age <= 35 ? -2 : -8;
  if (position === "RB") return age <= 22 ? 14 : age <= 24 ? 10 : age === 25 ? 6 : age === 26 ? 2 : age === 27 ? -4 : age === 28 ? -9 : -16;
  if (position === "WR") return age <= 22 ? 13 : age <= 25 ? 10 : age <= 28 ? 5 : age <= 30 ? 1 : age === 31 ? -5 : -11;
  if (position === "TE") return age <= 23 ? 11 : age <= 27 ? 8 : age <= 30 ? 3 : age === 31 ? -2 : -8;
  return 0;
}

function playerRating(
  profile: PlayerProfile | undefined,
  league: ImportedLeague,
  dynasty: boolean,
  snapshot?: PlayerWeeklySnapshot
) {
  if (!profile) return 18;
  const position = normalizePosition(profile.position);
  const rank = profile.searchRank && profile.searchRank > 0 ? profile.searchRank : null;
  let score = rank ? 100 - 22 * Math.log10(Math.max(rank, 1)) : 34;

  if (position === "QB") score += isSuperflex(league) ? 14 : -2;
  if (position === "TE" && isTightEndPremium(league)) score += 6;
  if (position === "K" || position === "DEF") score = Math.min(score, 30);
  score += statusPenalty(profile.status, dynasty);

  const projected = snapshot?.projectedPoints;
  if (projected !== null && projected !== undefined) {
    const production = clamp(projected * 4.25, 5, 108);
    score = dynasty ? score * 0.62 + production * 0.38 : score * 0.28 + production * 0.72;
  }

  if (dynasty) {
    score += ageAdjustment(position, profile.age);
    if (profile.yearsExperience !== null && profile.yearsExperience !== undefined && profile.yearsExperience <= 1) score += 3;
  }

  return clamp(score, 5, 115);
}

function slotEligibility(slot: string) {
  const normalized = slot.toUpperCase();
  if (FLEX_SLOTS.has(normalized)) return new Set(["RB", "WR", "TE"]);
  if (SUPERFLEX_SLOTS.has(normalized)) return new Set(["QB", "RB", "WR", "TE"]);
  if (["WR/RB", "W/R"].includes(normalized)) return new Set(["RB", "WR"]);
  if (["WR/TE", "W/T"].includes(normalized)) return new Set(["WR", "TE"]);
  if (normalized === "D/ST" || normalized === "DST") return new Set(["DEF"]);
  return new Set([normalized]);
}

function lineupSlots(league: ImportedLeague) {
  return league.rosterPositions
    .map((slot, index) => ({ slot: slot.toUpperCase(), index, eligible: slotEligibility(slot) }))
    .filter((slot) => !BENCH_SLOTS.has(slot.slot))
    .sort((a, b) => a.eligible.size - b.eligible.size || a.index - b.index);
}

function teamProfiles(team: LeagueTeam, profiles: Record<string, PlayerProfile>) {
  return team.players.map((playerId) => ({
    playerId,
    profile: team.playerProfiles?.[playerId] || profiles[playerId]
  }));
}

function optimizeLineup(
  team: LeagueTeam,
  league: ImportedLeague,
  profiles: Record<string, PlayerProfile>,
  dynasty: boolean,
  snapshots: Map<string, PlayerWeeklySnapshot>
) {
  const candidates = teamProfiles(team, profiles).map((item) => ({
    ...item,
    position: normalizePosition(item.profile?.position),
    value: playerRating(item.profile, league, dynasty, snapshots.get(item.playerId)),
    projectedPoints: snapshots.get(item.playerId)?.projectedPoints ?? null
  }));
  const used = new Set<string>();
  const starters: typeof candidates = [];

  lineupSlots(league).forEach((slot) => {
    const best = candidates
      .filter((candidate) => !used.has(candidate.playerId) && slot.eligible.has(candidate.position))
      .sort((a, b) => b.value - a.value)[0];
    if (!best) return;
    used.add(best.playerId);
    starters.push(best);
  });

  if (!starters.length && team.starters.length) {
    team.starters.forEach((playerId) => {
      const candidate = candidates.find((item) => item.playerId === playerId);
      if (candidate && !used.has(playerId)) {
        used.add(playerId);
        starters.push(candidate);
      }
    });
  }

  const bench = candidates.filter((candidate) => !used.has(candidate.playerId)).sort((a, b) => b.value - a.value);
  return { starters, bench, candidates };
}

function weightedAverage(values: number[], weights?: number[]) {
  if (!values.length) return 0;
  const actualWeights = weights || values.map(() => 1);
  const denominator = actualWeights.slice(0, values.length).reduce((sum, weight) => sum + weight, 0);
  if (!denominator) return 0;
  return values.reduce((sum, value, index) => sum + value * (actualWeights[index] ?? 1), 0) / denominator;
}

function starterRaw(lineup: ReturnType<typeof optimizeLineup>) {
  return weightedAverage(lineup.starters.map((player) => player.value));
}

function benchRaw(lineup: ReturnType<typeof optimizeLineup>) {
  const weights = [1, 0.82, 0.68, 0.54, 0.42, 0.32, 0.24, 0.18];
  return weightedAverage(lineup.bench.slice(0, weights.length).map((player) => player.value), weights);
}

function positionRaw(lineup: ReturnType<typeof optimizeLineup>, position: PowerPosition) {
  const starters = lineup.starters.filter((player) => player.position === position).map((player) => player.value);
  const depth = lineup.bench.filter((player) => player.position === position).slice(0, 2).map((player) => player.value);
  if (!starters.length && !depth.length) return 0;
  return weightedAverage([...starters, ...depth], [1, 0.9, 0.45, 0.28]);
}

function indexToBest(value: number, max: number) {
  if (max <= 0) return 0;
  return clamp((value / max) * 100);
}

function rankMap(values: Array<{ rosterId: number; value: number }>) {
  const sorted = [...values].sort((a, b) => b.value - a.value || a.rosterId - b.rosterId);
  return new Map(sorted.map((item, index) => [item.rosterId, index + 1]));
}

function gradeFor(score: number) {
  if (score >= 97) return "A+";
  if (score >= 92) return "A";
  if (score >= 88) return "A-";
  if (score >= 84) return "B+";
  if (score >= 79) return "B";
  if (score >= 74) return "B-";
  if (score >= 69) return "C+";
  if (score >= 63) return "C";
  if (score >= 57) return "C-";
  if (score >= 50) return "D";
  return "F";
}

function ordinal(value: number) {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function allPlayFor(teams: LeagueTeam[], weeklyScores: WeeklyTeamScore[]) {
  const result = new Map<number, { wins: number; losses: number; ties: number; completedWeeks: number }>();
  teams.forEach((team) => result.set(team.rosterId, { wins: 0, losses: 0, ties: 0, completedWeeks: 0 }));
  const byWeek = new Map<number, WeeklyTeamScore[]>();

  weeklyScores.forEach((score) => {
    const existing = byWeek.get(score.week) || [];
    existing.push(score);
    byWeek.set(score.week, existing);
  });

  [...byWeek.values()].forEach((scores) => {
    const unique = scores.filter((score, index, array) => array.findIndex((item) => item.rosterId === score.rosterId) === index);
    if (unique.length < 2) return;
    unique.forEach((score) => {
      const record = result.get(score.rosterId);
      if (!record) return;
      record.completedWeeks += 1;
      unique.forEach((opponent) => {
        if (opponent.rosterId === score.rosterId) return;
        if (score.points > opponent.points) record.wins += 1;
        else if (score.points < opponent.points) record.losses += 1;
        else record.ties += 1;
      });
    });
  });

  return result;
}

function headToHeadRecord(teams: LeagueTeam[], weeklyScores: WeeklyTeamScore[]) {
  const records = new Map<number, { wins: number; losses: number; ties: number }>();
  teams.forEach((team) => records.set(team.rosterId, { wins: 0, losses: 0, ties: 0 }));
  const groups = new Map<string, WeeklyTeamScore[]>();

  weeklyScores.forEach((score) => {
    if (score.matchupId === null) return;
    const key = `${score.week}:${score.matchupId}`;
    const existing = groups.get(key) || [];
    existing.push(score);
    groups.set(key, existing);
  });

  groups.forEach((scores) => {
    if (scores.length !== 2) return;
    const [first, second] = scores;
    const firstRecord = records.get(first.rosterId);
    const secondRecord = records.get(second.rosterId);
    if (!firstRecord || !secondRecord) return;
    if (first.points > second.points) {
      firstRecord.wins += 1;
      secondRecord.losses += 1;
    } else if (first.points < second.points) {
      firstRecord.losses += 1;
      secondRecord.wins += 1;
    } else {
      firstRecord.ties += 1;
      secondRecord.ties += 1;
    }
  });

  return records;
}

function performanceMetrics(teams: LeagueTeam[], weeklyScores: WeeklyTeamScore[], useOfficialRecord: boolean) {
  const allPlay = allPlayFor(teams, weeklyScores);
  const headToHead = headToHeadRecord(teams, weeklyScores);
  const weeklyPointTotals = new Map<number, number>();
  weeklyScores.forEach((score) => weeklyPointTotals.set(score.rosterId, (weeklyPointTotals.get(score.rosterId) || 0) + score.points));
  const hasWeeklyScores = weeklyScores.length > 0;
  const pointsForTeam = (team: LeagueTeam) => hasWeeklyScores ? weeklyPointTotals.get(team.rosterId) || 0 : team.pointsFor;
  const maxPoints = Math.max(...teams.map(pointsForTeam), 1);

  return new Map(teams.map((team) => {
    const record = allPlay.get(team.rosterId) || { wins: 0, losses: 0, ties: 0, completedWeeks: 0 };
    const h2h = headToHead.get(team.rosterId) || { wins: 0, losses: 0, ties: 0 };
    const comparisons = record.wins + record.losses + record.ties;
    const allPlayPct = comparisons ? (record.wins + record.ties * 0.5) / comparisons : 0;
    const officialGames = team.wins + team.losses + team.ties;
    const derivedGames = h2h.wins + h2h.losses + h2h.ties;
    const games = useOfficialRecord && officialGames ? officialGames : derivedGames;
    const resultWins = useOfficialRecord && officialGames ? team.wins + team.ties * 0.5 : h2h.wins + h2h.ties * 0.5;
    const winPct = games ? resultWins / games : 0;
    const expectedWins = comparisons ? allPlayPct * games : pointsForTeam(team) / maxPoints * games;
    const luckRating = games ? resultWins - expectedWins : 0;
    const pointsIndex = pointsForTeam(team) / maxPoints * 100;
    const performanceScore = comparisons
      ? pointsIndex * 0.45 + allPlayPct * 100 * 0.35 + winPct * 100 * 0.2
      : pointsIndex * 0.7 + winPct * 100 * 0.3;

    return [team.rosterId, {
      allPlayWins: record.wins,
      allPlayLosses: record.losses,
      allPlayTies: record.ties,
      allPlayPct,
      completedWeeks: record.completedWeeks,
      expectedWins,
      luckRating,
      performanceScore
    }] as const;
  }));
}

function luckLabel(value: number) {
  if (value >= 1.5) return "Very fortunate";
  if (value >= 0.6) return "Favorable schedule";
  if (value <= -1.5) return "Very unlucky";
  if (value <= -0.6) return "Unfavorable schedule";
  return "Near expectation";
}

function strongestPosition(positional: Record<PowerPosition, PositionMetric>) {
  return POWER_POSITIONS.reduce((best, position) => positional[position].rank < positional[best].rank ? position : best, "QB" as PowerPosition);
}

function weakestPosition(positional: Record<PowerPosition, PositionMetric>) {
  return POWER_POSITIONS.reduce((worst, position) => positional[position].rank > positional[worst].rank ? position : worst, "QB" as PowerPosition);
}

function confidenceFor(coverage: number, completedWeeks: number) : PowerConfidence {
  if (coverage >= 0.85 && completedWeeks >= 3) return "High";
  if (coverage >= 0.6 || completedWeeks >= 1) return "Medium";
  return "Limited";
}

export function buildPowerRankings(
  league: ImportedLeague,
  profiles: Record<string, PlayerProfile>,
  weeklyScores: WeeklyTeamScore[] = [],
  playerSnapshots: PlayerWeeklySnapshot[] = []
): PowerRankingTeam[] {
  const snapshotMap = new Map(playerSnapshots.map((snapshot) => [snapshot.playerId, snapshot]));
  const currentPerformance = performanceMetrics(league.teams, weeklyScores, true);
  const lastCompletedWeek = weeklyScores.reduce((max, score) => Math.max(max, score.week), 0);
  const previousScores = lastCompletedWeek > 1 ? weeklyScores.filter((score) => score.week < lastCompletedWeek) : [];
  const previousPerformance = performanceMetrics(league.teams, previousScores, false);

  const raw = league.teams.map((team) => {
    const redraftLineup = optimizeLineup(team, league, profiles, false, snapshotMap);
    const dynastyLineup = optimizeLineup(team, league, profiles, true, snapshotMap);
    const embeddedProfiles = Object.keys(team.playerProfiles || {}).length;
    const covered = team.players.filter((playerId) => Boolean(team.playerProfiles?.[playerId] || profiles[playerId])).length;
    const playerCoverage = team.players.length ? Math.max(covered, embeddedProfiles) / team.players.length : 0;
    const draftCapital = (league.draftPicks || [])
      .filter((pick) => pick.ownerRosterId === team.rosterId)
      .map((pick) => tradeValueForPick(pick, league.teams, league.season).value)
      .sort((a, b) => b - a)
      .slice(0, 12)
      .reduce((sum, value, index) => sum + value * Math.max(0.25, 1 - index * 0.06), 0);

    return {
      team,
      redraftStarterRaw: starterRaw(redraftLineup),
      redraftBenchRaw: benchRaw(redraftLineup),
      dynastyStarterRaw: starterRaw(dynastyLineup),
      dynastyBenchRaw: benchRaw(dynastyLineup),
      positionsRaw: Object.fromEntries(POWER_POSITIONS.map((position) => [position, positionRaw(redraftLineup, position)])) as Record<PowerPosition, number>,
      draftCapital,
      playerCoverage,
      projectedStarterPoints: redraftLineup.starters.some((player) => player.projectedPoints !== null)
        ? redraftLineup.starters.reduce((sum, player) => sum + (player.projectedPoints || 0), 0)
        : null,
      projectionCoverage: redraftLineup.starters.length
        ? redraftLineup.starters.filter((player) => player.projectedPoints !== null).length / redraftLineup.starters.length
        : 0
    };
  });

  const maxStarter = Math.max(...raw.map((item) => item.redraftStarterRaw), 1);
  const maxBench = Math.max(...raw.map((item) => item.redraftBenchRaw), 1);
  const maxDynastyStarter = Math.max(...raw.map((item) => item.dynastyStarterRaw), 1);
  const maxDynastyBench = Math.max(...raw.map((item) => item.dynastyBenchRaw), 1);
  const maxDraftCapital = Math.max(...raw.map((item) => item.draftCapital), 1);
  const maxPosition = Object.fromEntries(POWER_POSITIONS.map((position) => [position, Math.max(...raw.map((item) => item.positionsRaw[position]), 1)])) as Record<PowerPosition, number>;

  const prepared = raw.map((item) => {
    const starterScore = indexToBest(item.redraftStarterRaw, maxStarter);
    const benchScore = indexToBest(item.redraftBenchRaw, maxBench);
    const dynastyStarterScore = indexToBest(item.dynastyStarterRaw, maxDynastyStarter);
    const dynastyBenchScore = indexToBest(item.dynastyBenchRaw, maxDynastyBench);
    const draftCapitalScore = indexToBest(item.draftCapital, maxDraftCapital);
    const positionalScores = Object.fromEntries(POWER_POSITIONS.map((position) => [position, indexToBest(item.positionsRaw[position], maxPosition[position])])) as Record<PowerPosition, number>;
    const positionalBalance = weightedAverage(Object.values(positionalScores));
    const performance = currentPerformance.get(item.team.rosterId)!;
    const previous = previousPerformance.get(item.team.rosterId)!;
    const contenderScore = starterScore * 0.5 + benchScore * 0.14 + performance.performanceScore * 0.26 + positionalBalance * 0.1;
    const dynastyScore = dynastyStarterScore * 0.58 + dynastyBenchScore * 0.22 + draftCapitalScore * 0.2;
    const overallRaw = league.leagueType === "dynasty"
      ? contenderScore * 0.62 + dynastyScore * 0.38
      : league.leagueType === "keeper"
        ? contenderScore * 0.78 + dynastyScore * 0.22
        : contenderScore;
    const previousContender = starterScore * 0.5 + benchScore * 0.14 + previous.performanceScore * 0.26 + positionalBalance * 0.1;
    const previousOverallRaw = league.leagueType === "dynasty"
      ? previousContender * 0.62 + dynastyScore * 0.38
      : league.leagueType === "keeper"
        ? previousContender * 0.78 + dynastyScore * 0.22
        : previousContender;

    return {
      ...item,
      starterScore,
      benchScore,
      positionalScores,
      contenderScore,
      dynastyScore,
      overallRaw,
      previousOverallRaw,
      performance
    };
  });

  const maxOverall = Math.max(...prepared.map((item) => item.overallRaw), 1);
  const maxContender = Math.max(...prepared.map((item) => item.contenderScore), 1);
  const maxDynasty = Math.max(...prepared.map((item) => item.dynastyScore), 1);
  const overallValues = prepared.map((item) => ({ rosterId: item.team.rosterId, value: item.overallRaw }));
  const contenderValues = prepared.map((item) => ({ rosterId: item.team.rosterId, value: item.contenderScore }));
  const dynastyValues = prepared.map((item) => ({ rosterId: item.team.rosterId, value: item.dynastyScore }));
  const starterValues = prepared.map((item) => ({ rosterId: item.team.rosterId, value: item.starterScore }));
  const benchValues = prepared.map((item) => ({ rosterId: item.team.rosterId, value: item.benchScore }));
  const overallRanks = rankMap(overallValues);
  const contenderRanks = rankMap(contenderValues);
  const dynastyRanks = rankMap(dynastyValues);
  const starterRanks = rankMap(starterValues);
  const benchRanks = rankMap(benchValues);
  const previousRanks = previousScores.length ? rankMap(prepared.map((item) => ({ rosterId: item.team.rosterId, value: item.previousOverallRaw }))) : new Map<number, number>();
  const positionRanks = Object.fromEntries(POWER_POSITIONS.map((position) => [position, rankMap(prepared.map((item) => ({ rosterId: item.team.rosterId, value: item.positionalScores[position] })))])) as Record<PowerPosition, Map<number, number>>;

  return prepared
    .map((item) => {
      const rosterId = item.team.rosterId;
      const overallRank = overallRanks.get(rosterId) || league.teams.length;
      const previousRank = previousRanks.get(rosterId) ?? null;
      const positional = Object.fromEntries(POWER_POSITIONS.map((position) => {
        const score = item.positionalScores[position];
        return [position, { score, rank: positionRanks[position].get(rosterId) || league.teams.length, grade: gradeFor(score) }];
      })) as Record<PowerPosition, PositionMetric>;
      const strongest = strongestPosition(positional);
      const weakest = weakestPosition(positional);
      const explanations = [
        `Starter strength ranks ${ordinal(starterRanks.get(rosterId) || league.teams.length)} and bench depth ranks ${ordinal(benchRanks.get(rosterId) || league.teams.length)}.`,
        `${strongest} is the roster's strongest position (${ordinal(positional[strongest].rank)}); ${weakest} is the clearest weakness (${ordinal(positional[weakest].rank)}).`,
        item.projectedStarterPoints !== null
          ? `The optimized lineup projects for ${item.projectedStarterPoints.toFixed(2)} points with ${Math.round(item.projectionCoverage * 100)}% starter projection coverage.`
          : "Sleeper weekly projections are not populated for enough starters yet, so roster metadata carries more weight.",
        item.performance.completedWeeks
          ? `The all-play profile is ${(item.performance.allPlayPct * 100).toFixed(1)}%, translating to ${item.performance.expectedWins.toFixed(1)} expected wins versus ${item.team.wins + item.team.ties * 0.5} actual.`
          : "Weekly matchup data is not available yet, so the ranking leans more heavily on roster construction and season totals.",
        league.leagueType === "dynasty"
          ? `The long-term roster ranks ${ordinal(dynastyRanks.get(rosterId) || league.teams.length)} after combining age-adjusted player strength, depth, and owned draft capital.`
          : `The contender model ranks this roster ${ordinal(contenderRanks.get(rosterId) || league.teams.length)} for the current competitive window.`
      ];

      return {
        ...item.team,
        pointDiff: item.team.pointsFor - item.team.pointsAgainst,
        powerScore: item.overallRaw,
        rank: overallRank,
        overallScore: Number(indexToBest(item.overallRaw, maxOverall).toFixed(1)),
        overallRank,
        contenderScore: Number(indexToBest(item.contenderScore, maxContender).toFixed(1)),
        contenderRank: contenderRanks.get(rosterId) || league.teams.length,
        dynastyScore: Number(indexToBest(item.dynastyScore, maxDynasty).toFixed(1)),
        dynastyRank: dynastyRanks.get(rosterId) || league.teams.length,
        starterScore: Number(item.starterScore.toFixed(1)),
        starterRank: starterRanks.get(rosterId) || league.teams.length,
        benchScore: Number(item.benchScore.toFixed(1)),
        benchRank: benchRanks.get(rosterId) || league.teams.length,
        positional,
        allPlayWins: item.performance.allPlayWins,
        allPlayLosses: item.performance.allPlayLosses,
        allPlayTies: item.performance.allPlayTies,
        allPlayPct: item.performance.allPlayPct,
        expectedWins: item.performance.expectedWins,
        luckRating: item.performance.luckRating,
        luckLabel: luckLabel(item.performance.luckRating),
        previousRank,
        movement: previousRank === null ? null : previousRank - overallRank,
        explanations,
        confidence: confidenceFor(item.playerCoverage, item.performance.completedWeeks),
        playerCoverage: item.playerCoverage,
        completedWeeks: item.performance.completedWeeks,
        projectedStarterPoints: item.projectedStarterPoints === null ? null : Math.round(item.projectedStarterPoints * 10) / 10,
        projectionCoverage: item.projectionCoverage
      } satisfies PowerRankingTeam;
    })
    .sort((a, b) => a.overallRank - b.overallRank);
}

export function rankingsForLens(rankings: PowerRankingTeam[], lens: PowerLens) {
  const key = lens === "contender" ? "contenderRank" : lens === "dynasty" ? "dynastyRank" : "overallRank";
  return [...rankings].sort((a, b) => a[key] - b[key]);
}
