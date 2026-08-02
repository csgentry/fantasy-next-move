import type {
  ImportedLeague,
  LeagueTeam,
  PlayerIntelligencePayload,
  PlayerProfile,
  PlayerRecommendation,
  PlayerWeeklySnapshot,
  ProjectionAccuracy
} from "./types";

const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);
const SUPERFLEX_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);
const BENCH_SLOTS = new Set(["BN", "BENCH", "IR", "IR+", "RESERVE", "TAXI", "NA"]);

function round(value: number, places = 1) {
  const multiplier = 10 ** places;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function normalizeFantasyPosition(position: string | null | undefined) {
  const value = (position || "—").split(/[,/]/)[0]?.trim().toUpperCase() || "—";
  return value === "D/ST" || value === "DST" ? "DEF" : value;
}

export function snapshotsByPlayer(snapshots: PlayerWeeklySnapshot[]) {
  return new Map(snapshots.map((snapshot) => [snapshot.playerId, snapshot]));
}

export function calculateProjectionAccuracy(
  snapshots: PlayerWeeklySnapshot[],
  week: number | null = null
): ProjectionAccuracy {
  const sample = snapshots.filter(
    (snapshot) => snapshot.projectedPoints !== null && snapshot.actualPoints !== null
  );
  if (!sample.length) {
    return {
      week,
      sampleSize: 0,
      meanAbsoluteError: null,
      rootMeanSquaredError: null,
      bias: null,
      withinThreePointsPct: null,
      withinFivePointsPct: null
    };
  }

  const errors = sample.map(
    (snapshot) => (snapshot.actualPoints || 0) - (snapshot.projectedPoints || 0)
  );
  const absolute = errors.map(Math.abs);
  const mae = absolute.reduce((sum, value) => sum + value, 0) / sample.length;
  const rmse = Math.sqrt(
    errors.reduce((sum, value) => sum + value * value, 0) / sample.length
  );
  const bias = errors.reduce((sum, value) => sum + value, 0) / sample.length;

  return {
    week,
    sampleSize: sample.length,
    meanAbsoluteError: round(mae, 2),
    rootMeanSquaredError: round(rmse, 2),
    bias: round(bias, 2),
    withinThreePointsPct: round(
      (absolute.filter((value) => value <= 3).length / sample.length) * 100,
      1
    ),
    withinFivePointsPct: round(
      (absolute.filter((value) => value <= 5).length / sample.length) * 100,
      1
    )
  };
}

function profileFor(
  playerId: string,
  profiles: Record<string, PlayerProfile>,
  snapshotMap: Map<string, PlayerWeeklySnapshot>
) {
  const snapshot = snapshotMap.get(playerId);
  return (
    profiles[playerId] || {
      playerId,
      fullName: snapshot?.playerName || playerId,
      position: snapshot?.position || "—",
      team: snapshot?.nflTeam || null,
      status: null
    }
  );
}

function projectedPoints(
  playerId: string,
  snapshotMap: Map<string, PlayerWeeklySnapshot>
) {
  return snapshotMap.get(playerId)?.projectedPoints ?? null;
}

function lineupEligibility(slot: string) {
  const normalized = slot.toUpperCase();
  if (["FLEX", "W/R/T", "WRT", "WRRB_FLEX", "REC_FLEX"].includes(normalized)) {
    return FLEX_POSITIONS;
  }
  if (["SUPER_FLEX", "SF", "OP", "Q/W/R/T", "FLEX_QB"].includes(normalized)) {
    return SUPERFLEX_POSITIONS;
  }
  if (["W/R", "WR/RB"].includes(normalized)) return new Set(["WR", "RB"]);
  if (["W/T", "WR/TE"].includes(normalized)) return new Set(["WR", "TE"]);
  if (["DST", "D/ST"].includes(normalized)) return new Set(["DEF"]);
  return new Set([normalized]);
}

function requiredSlots(league: ImportedLeague) {
  return league.rosterPositions
    .map((slot, index) => ({ slot: slot.toUpperCase(), index, eligible: lineupEligibility(slot) }))
    .filter((slot) => !BENCH_SLOTS.has(slot.slot))
    .sort((a, b) => a.eligible.size - b.eligible.size || a.index - b.index);
}

export function optimizeProjectedLineup(
  team: LeagueTeam,
  league: ImportedLeague,
  profiles: Record<string, PlayerProfile>,
  snapshots: PlayerWeeklySnapshot[]
) {
  const snapshotMap = snapshotsByPlayer(snapshots);
  const candidates = team.players.map((playerId) => {
    const profile = profileFor(playerId, profiles, snapshotMap);
    return {
      playerId,
      profile,
      position: normalizeFantasyPosition(profile.position),
      projectedPoints: projectedPoints(playerId, snapshotMap) ?? 0
    };
  });
  const used = new Set<string>();
  const starters: typeof candidates = [];

  requiredSlots(league).forEach((slot) => {
    const best = candidates
      .filter(
        (candidate) =>
          !used.has(candidate.playerId) && slot.eligible.has(candidate.position)
      )
      .sort((a, b) => b.projectedPoints - a.projectedPoints)[0];
    if (!best) return;
    used.add(best.playerId);
    starters.push(best);
  });

  if (!starters.length) {
    team.starters.forEach((playerId) => {
      const player = candidates.find((candidate) => candidate.playerId === playerId);
      if (player && !used.has(playerId)) {
        used.add(playerId);
        starters.push(player);
      }
    });
  }

  const bench = candidates
    .filter((candidate) => !used.has(candidate.playerId))
    .sort((a, b) => b.projectedPoints - a.projectedPoints);

  return {
    starters,
    bench,
    total: round(starters.reduce((sum, player) => sum + player.projectedPoints, 0), 2)
  };
}

function confidenceFor(snapshot: PlayerWeeklySnapshot | undefined) {
  if (!snapshot || snapshot.projectedPoints === null) return "Limited" as const;
  if (Object.keys(snapshot.projectionStats || {}).length >= 4) return "High" as const;
  return "Medium" as const;
}

function positionStrength(
  team: LeagueTeam,
  position: string,
  profiles: Record<string, PlayerProfile>,
  snapshotMap: Map<string, PlayerWeeklySnapshot>,
  league: ImportedLeague
) {
  const normalizedSlots = league.rosterPositions.map((slot) => slot.toUpperCase());
  const superflex = normalizedSlots.some((slot) => ["SUPER_FLEX", "SF", "OP", "Q/W/R/T"].includes(slot));
  const directCount = normalizedSlots.filter((slot) => slot === position).length;
  const targetCount = position === "QB" ? Math.max(1, directCount + (superflex ? 1 : 0))
    : position === "WR" ? Math.max(2, directCount)
      : position === "RB" ? Math.max(2, directCount)
        : Math.max(1, directCount);
  return team.players
    .filter((playerId) => normalizeFantasyPosition(profileFor(playerId, profiles, snapshotMap).position) === position)
    .map((playerId) => projectedPoints(playerId, snapshotMap) || 0)
    .sort((a, b) => b - a)
    .slice(0, targetCount)
    .reduce((sum, value) => sum + value, 0);
}

function teamWeakness(
  team: LeagueTeam,
  league: ImportedLeague,
  profiles: Record<string, PlayerProfile>,
  snapshotMap: Map<string, PlayerWeeklySnapshot>
) {
  const positions = ["QB", "RB", "WR", "TE"];
  const comparisons = positions.map((position) => {
    const values = league.teams.map((leagueTeam) => ({
      rosterId: leagueTeam.rosterId,
      score: positionStrength(leagueTeam, position, profiles, snapshotMap, league)
    })).sort((a, b) => b.score - a.score);
    const current = values.find((value) => value.rosterId === team.rosterId)?.score || 0;
    const rank = values.findIndex((value) => value.rosterId === team.rosterId) + 1;
    const average = values.reduce((sum, value) => sum + value.score, 0) / Math.max(values.length, 1);
    return { position, score: current, rank: rank || values.length, average };
  }).sort((a, b) => b.rank - a.rank || (a.score / Math.max(a.average, 0.01)) - (b.score / Math.max(b.average, 0.01)));
  const weakest = comparisons[0] || { position: "FLEX", score: 0, rank: league.totalRosters, average: 0 };
  const actionable = weakest.rank > Math.ceil(league.totalRosters / 2) || weakest.score < weakest.average * 0.9;
  return { ...weakest, actionable };
}

function recommendationId(prefix: string, playerId?: string) {
  return `${prefix}:${playerId || "team"}`;
}

export function buildPersonalizedPlayerRecommendations(
  league: ImportedLeague,
  team: LeagueTeam,
  intelligence: PlayerIntelligencePayload
): PlayerRecommendation[] {
  const snapshots = intelligence.currentSnapshots;
  const snapshotMap = snapshotsByPlayer(snapshots);
  const profiles = intelligence.profiles;
  const recommendations: PlayerRecommendation[] = [];

  const projected = optimizeProjectedLineup(team, league, profiles, snapshots);
  const actualStarterIds = new Set(team.starters);
  const projectedStarterIds = new Set(projected.starters.map((player) => player.playerId));
  const bestPromotion = projected.starters
    .filter((player) => !actualStarterIds.has(player.playerId))
    .map((player) => {
      const replaced = team.starters
        .map((playerId) => {
          const profile = profileFor(playerId, profiles, snapshotMap);
          return {
            playerId,
            profile,
            position: normalizeFantasyPosition(profile.position),
            points: projectedPoints(playerId, snapshotMap) || 0
          };
        })
        .filter((starter) => starter.position === player.position)
        .sort((a, b) => a.points - b.points)[0];
      return replaced
        ? { player, replaced, gain: player.projectedPoints - replaced.points }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.gain - a.gain)[0];

  if (bestPromotion && bestPromotion.gain >= 1) {
    recommendations.push({
      id: recommendationId("lineup", bestPromotion.player.playerId),
      title: `Start ${bestPromotion.player.profile.fullName}`,
      reason: `${bestPromotion.player.profile.fullName} projects for ${bestPromotion.player.projectedPoints.toFixed(2)} points, ${bestPromotion.gain.toFixed(2)} more than ${bestPromotion.replaced.profile.fullName} in the same position group.`,
      category: "Lineup",
      impact: bestPromotion.gain >= 3 ? "High" : "Medium",
      confidence: confidenceFor(snapshotMap.get(bestPromotion.player.playerId)),
      playerId: bestPromotion.player.playerId,
      playerName: bestPromotion.player.profile.fullName,
      projectedGain: round(bestPromotion.gain)
    });
  }

  const rosteredIds = new Set(league.teams.flatMap((leagueTeam) => leagueTeam.players));
  const weakness = teamWeakness(team, league, profiles, snapshotMap);
  const weakestPosition = weakness.position;
  const freeAgents = snapshots
    .filter(
      (snapshot) =>
        !rosteredIds.has(snapshot.playerId) &&
        snapshot.projectedPoints !== null &&
        snapshot.projectedPoints > 0 &&
        [weakestPosition, "RB", "WR", "TE", "QB"].includes(
          normalizeFantasyPosition(snapshot.position)
        )
    )
    .sort((a, b) => (b.projectedPoints || 0) - (a.projectedPoints || 0));
  const waiverTarget =
    freeAgents.find(
      (snapshot) => normalizeFantasyPosition(snapshot.position) === weakestPosition
    ) || freeAgents[0];

  if (waiverTarget && weakness.actionable) {
    const samePositionRoster = team.players
      .filter(
        (playerId) =>
          normalizeFantasyPosition(profileFor(playerId, profiles, snapshotMap).position) ===
          normalizeFantasyPosition(waiverTarget.position)
      )
      .map((playerId) => projectedPoints(playerId, snapshotMap) || 0)
      .sort((a, b) => a - b);
    const replacement = samePositionRoster[0] || 0;
    const gain = (waiverTarget.projectedPoints || 0) - replacement;
    if (gain >= 0.75) {
      recommendations.push({
        id: recommendationId("waiver", waiverTarget.playerId),
        title: `Add ${waiverTarget.playerName}`,
        reason: `${waiverTarget.playerName} is unrostered and projects for ${waiverTarget.projectedPoints?.toFixed(2)} points at ${normalizeFantasyPosition(waiverTarget.position)}, your lowest league-relative position group (ranked #${weakness.rank} of ${league.totalRosters}). That is a ${gain.toFixed(2)}-point improvement over the bottom of your current depth chart.`,
        category: "Waiver",
        impact: gain >= 3 ? "High" : "Medium",
        confidence: confidenceFor(waiverTarget),
        playerId: waiverTarget.playerId,
        playerName: waiverTarget.playerName,
        projectedGain: round(gain)
      });
    }
  }

  const otherTeams = league.teams.filter((leagueTeam) => leagueTeam.rosterId !== team.rosterId);
  const tradeTargets = otherTeams.flatMap((otherTeam) =>
    otherTeam.players
      .filter((playerId) => !otherTeam.starters.includes(playerId))
      .map((playerId) => {
        const snapshot = snapshotMap.get(playerId);
        const profile = profileFor(playerId, profiles, snapshotMap);
        return {
          playerId,
          snapshot,
          profile,
          otherTeam,
          position: normalizeFantasyPosition(profile.position),
          points: snapshot?.projectedPoints || 0
        };
      })
  );
  const tradeTarget = tradeTargets
    .filter((candidate) => candidate.position === weakestPosition && candidate.points > 0)
    .sort((a, b) => b.points - a.points)[0];

  if (tradeTarget && weakness.actionable) {
    recommendations.push({
      id: recommendationId("trade-target", tradeTarget.playerId),
      title: `Explore a trade for ${tradeTarget.profile.fullName}`,
      reason: `${tradeTarget.profile.fullName} projects for ${tradeTarget.points.toFixed(2)} points and is currently outside ${tradeTarget.otherTeam.teamName}'s imported starting lineup. The fit addresses your #${weakness.rank}-ranked ${weakestPosition} group without revealing that manager's private recommendations.`,
      category: "Trade",
      impact: "Medium",
      confidence: confidenceFor(tradeTarget.snapshot),
      playerId: tradeTarget.playerId,
      playerName: tradeTarget.profile.fullName,
      targetRosterId: tradeTarget.otherTeam.rosterId,
      targetTeamName: tradeTarget.otherTeam.teamName
    });
  }

  const accuracyMap = snapshotsByPlayer(intelligence.accuracySnapshots);
  const sellHigh = team.players
    .map((playerId) => {
      const prior = accuracyMap.get(playerId);
      const current = snapshotMap.get(playerId);
      const profile = profileFor(playerId, profiles, snapshotMap);
      const recentError = prior?.projectionError ?? null;
      return { playerId, prior, current, profile, recentError };
    })
    .filter(
      (candidate) =>
        candidate.recentError !== null &&
        candidate.recentError >= 7 &&
        candidate.current?.projectedPoints !== null
    )
    .sort((a, b) => (b.recentError || 0) - (a.recentError || 0))[0];

  if (sellHigh) {
    recommendations.push({
      id: recommendationId("sell-high", sellHigh.playerId),
      title: `Test the market on ${sellHigh.profile.fullName}`,
      reason: `${sellHigh.profile.fullName} beat last week's Sleeper projection by ${sellHigh.recentError?.toFixed(2)} points, while the current projection is ${sellHigh.current?.projectedPoints?.toFixed(2)}. That performance spike may create a temporary selling window; do not move him unless the return improves your starting lineup.`,
      category: "Trade",
      impact: "Medium",
      confidence: confidenceFor(sellHigh.current),
      playerId: sellHigh.playerId,
      playerName: sellHigh.profile.fullName
    });
  }

  if (!recommendations.length) {
    const bestProjected = projected.starters[0];
    recommendations.push({
      id: recommendationId("strategy"),
      title: "Protect your projected starting lineup",
      reason: bestProjected
        ? `${bestProjected.profile.fullName} leads your optimized lineup at ${bestProjected.projectedPoints.toFixed(2)} projected points. No clear lineup or waiver upgrade currently clears the model's action threshold.`
        : "Sleeper projections are not populated for enough of this roster yet. FantasyNextMove will replace this message with player-specific moves as the weekly feed fills in.",
      category: "Strategy",
      impact: "Low",
      confidence: bestProjected ? "Medium" : "Limited"
    });
  }

  return recommendations.slice(0, 4);
}

export function projectedTeamTotal(
  team: LeagueTeam,
  league: ImportedLeague,
  intelligence: PlayerIntelligencePayload
) {
  return optimizeProjectedLineup(
    team,
    league,
    intelligence.profiles,
    intelligence.currentSnapshots
  ).total;
}
