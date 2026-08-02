import type { DraftPickAsset, LeagueTeam, PlayerProfile, PlayerWeeklySnapshot } from "./types";
import type { MarketValueSignal } from "./market-values";

export type TradeFormat = "redraft" | "keeper" | "dynasty";
export type ValueConfidence = "High" | "Medium" | "Limited";
export type PickTier = "early" | "mid" | "late";
export type AssetTier = "Elite" | "Cornerstone" | "Core starter" | "Starter" | "Depth" | "Stash";

export type TradeValueContext = {
  rosterPositions: string[];
  scoringSettings: Record<string, number>;
  totalRosters?: number;
};

export type TradeValueResult = {
  value: number;
  lowValue: number;
  highValue: number;
  confidence: ValueConfidence;
  tier: AssetTier;
  position: string;
  projectedPoints: number | null;
  recentActualPoints: number | null;
  productionAdjustment: number;
  marketRank: number | null;
  marketPositionRank: number | null;
  marketSource: string | null;
};

const WEEKLY_BASELINE: Record<string, number> = { QB: 18, RB: 10.5, WR: 10.5, TE: 8, K: 7, DEF: 7, DST: 7 };
const FALLBACK_VALUE: Record<string, number> = { QB: 1350, RB: 1500, WR: 1550, TE: 1250, K: 120, DEF: 160, DST: 160 };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, step = 5) {
  return Math.round(value / step) * step;
}

export function normalizePosition(position: string | null | undefined) {
  const first = (position || "—").split(/[,/]/)[0]?.trim().toUpperCase() || "—";
  return first === "D/ST" ? "DEF" : first;
}

export function isSuperflex(rosterPositions: string[]) {
  return rosterPositions.some((position) => ["SUPER_FLEX", "SF", "OP", "Q/W/R/T", "FLEX_QB"].includes(position.toUpperCase()));
}

function isTightEndPremium(scoringSettings: Record<string, number>) {
  return Object.entries(scoringSettings).some(([key, value]) => {
    const normalized = key.toLowerCase();
    return normalized.includes("te") && normalized.includes("rec") && Number(value) > 0;
  });
}

function marketValueFromRank(rank: number | null | undefined) {
  if (!rank || rank <= 0) return null;
  // A smooth long-tail curve keeps elite assets separated while preserving
  // meaningful values for starters, rookies, depth players, and draft picks.
  return 9950 * Math.exp(-(rank - 1) / 82);
}

function dynastyAgeAdjustment(position: string, age: number | null | undefined) {
  if (!age || age < 18 || age > 50) return 0;
  if (position === "QB") return age <= 24 ? 900 : age <= 27 ? 700 : age <= 31 ? 350 : age <= 34 ? 0 : age <= 36 ? -500 : -1100;
  if (position === "RB") return age <= 22 ? 1300 : age === 23 ? 1000 : age <= 25 ? 500 : age === 26 ? 0 : age === 27 ? -600 : age === 28 ? -1200 : -2100;
  if (position === "WR") return age <= 22 ? 1150 : age <= 24 ? 900 : age <= 27 ? 450 : age <= 29 ? 100 : age === 30 ? -300 : age === 31 ? -750 : -1300;
  if (position === "TE") return age <= 23 ? 900 : age <= 26 ? 700 : age <= 29 ? 350 : age === 30 ? 0 : age === 31 ? -350 : -850;
  return 0;
}

function statusAdjustment(status: string | null, format: TradeFormat) {
  if (!status) return 0;
  const normalized = status.toLowerCase();
  if (["active", "healthy", "probable"].includes(normalized)) return 0;
  const redraft = format === "redraft";
  if (normalized.includes("out") || normalized.includes("ir") || normalized.includes("pup")) return redraft ? -1400 : -550;
  if (normalized.includes("doubtful")) return redraft ? -900 : -350;
  if (normalized.includes("questionable")) return redraft ? -350 : -100;
  return redraft ? -200 : -75;
}

function weeklyProductionAdjustment(position: string, format: TradeFormat, snapshot?: PlayerWeeklySnapshot) {
  const projection = snapshot?.projectedPoints;
  if (projection === null || projection === undefined) return 0;
  const baseline = WEEKLY_BASELINE[position] ?? 8;
  const weight = format === "redraft" ? 170 : format === "keeper" ? 105 : 75;
  let adjustment = clamp((projection - baseline) * weight, -1500, format === "redraft" ? 2500 : 1300);
  if (snapshot?.recentError !== null && snapshot?.recentError !== undefined) {
    adjustment += clamp(snapshot.recentError * (format === "redraft" ? 22 : 10), -250, 250);
  }
  return roundTo(adjustment);
}

function tierFor(value: number): AssetTier {
  if (value >= 9000) return "Elite";
  if (value >= 7600) return "Cornerstone";
  if (value >= 5600) return "Core starter";
  if (value >= 3300) return "Starter";
  if (value >= 1100) return "Depth";
  return "Stash";
}

function rangeFor(value: number, confidence: ValueConfidence) {
  const spread = confidence === "High" ? 0.06 : confidence === "Medium" ? 0.11 : 0.18;
  return {
    lowValue: roundTo(Math.max(1, value * (1 - spread))),
    highValue: roundTo(Math.min(9995, value * (1 + spread)))
  };
}

export function tradeValueForPlayer(
  profile: PlayerProfile,
  starter: boolean,
  format: TradeFormat,
  context: TradeValueContext,
  snapshot?: PlayerWeeklySnapshot,
  market?: MarketValueSignal | null
): TradeValueResult {
  const position = normalizePosition(profile.position);
  const rankedMarket = marketValueFromRank(profile.searchRank);
  const internalBase = rankedMarket ?? FALLBACK_VALUE[position] ?? 700;
  // The permitted composite market feed anchors current sentiment while the
  // FantasyNextMove model preserves league, projection, age, and roster context.
  const base = market ? market.value * 0.74 + internalBase * 0.26 : internalBase;
  const productionAdjustment = weeklyProductionAdjustment(position, format, snapshot);
  let value = base + productionAdjustment + (starter ? (format === "redraft" ? 450 : 260) : 0) + statusAdjustment(profile.status, format);

  if (format === "dynasty" || format === "keeper") {
    const ageWeight = format === "keeper" ? 0.55 : 1;
    value += dynastyAgeAdjustment(position, profile.age) * ageWeight;
    const rookie = profile.yearsExperience !== null && profile.yearsExperience !== undefined && profile.yearsExperience <= 1;
    if (rookie) {
      // Premium rookies must not collapse toward backup veterans simply because
      // their immediate weekly projection is modest before they have NFL history.
      // A live market signal already includes most rookie enthusiasm, so avoid
      // double-counting it when that source is available.
      value += market ? 180 : profile.searchRank && profile.searchRank <= 75 ? 900 : 450;
    }
  }

  if (position === "QB" && isSuperflex(context.rosterPositions)) value += format === "redraft" ? 1500 : 1900;
  if (position === "QB" && (context.totalRosters || 0) >= 14) value += 250;
  if (position === "TE" && isTightEndPremium(context.scoringSettings)) value += format === "redraft" ? 450 : 650;

  const hasProjection = snapshot?.projectedPoints !== null && snapshot?.projectedPoints !== undefined;
  const hasProfileSignal = Boolean(profile.searchRank || profile.age || profile.yearsExperience !== null);
  const hasMarketSignal = Boolean(market?.value);
  const confidence: ValueConfidence = hasMarketSignal && (hasProjection || hasProfileSignal) ? "High" : hasMarketSignal || hasProjection || hasProfileSignal ? "Medium" : "Limited";
  const lockedValue = roundTo(clamp(value, 1, 9995));
  const range = rangeFor(lockedValue, confidence);
  return {
    value: lockedValue,
    ...range,
    confidence,
    tier: tierFor(lockedValue),
    position,
    projectedPoints: snapshot?.projectedPoints ?? null,
    recentActualPoints: snapshot?.previousActualPoints ?? null,
    productionAdjustment,
    marketRank: market?.overallRank ?? null,
    marketPositionRank: market?.positionRank ?? null,
    marketSource: market?.source ?? null
  };
}

export function projectedPickTier(originalTeam: LeagueTeam | undefined, teams: LeagueTeam[]): PickTier {
  if (!originalTeam || teams.length < 3) return "mid";
  const hasMeaningfulResults = teams.some((team) => team.wins + team.losses + team.ties > 0 || team.pointsFor > 0);
  if (!hasMeaningfulResults) return "mid";
  const sorted = [...teams].sort((a, b) => {
    const aGames = Math.max(a.wins + a.losses + a.ties, 1);
    const bGames = Math.max(b.wins + b.losses + b.ties, 1);
    const aPct = (a.wins + a.ties * 0.5) / aGames;
    const bPct = (b.wins + b.ties * 0.5) / bGames;
    return aPct - bPct || a.pointsFor - b.pointsFor;
  });
  const index = sorted.findIndex((team) => team.rosterId === originalTeam.rosterId);
  const third = Math.max(1, Math.ceil(sorted.length / 3));
  if (index < third) return "early";
  if (index >= sorted.length - third) return "late";
  return "mid";
}

function basePickValue(round: number, tier: PickTier) {
  const values: Record<number, Record<PickTier, number>> = {
    1: { early: 7900, mid: 6100, late: 4700 },
    2: { early: 3100, mid: 2450, late: 1850 },
    3: { early: 1350, mid: 1000, late: 760 },
    4: { early: 650, mid: 460, late: 330 },
    5: { early: 300, mid: 220, late: 150 }
  };
  return values[Math.min(round, 5)]?.[tier] ?? 120;
}

export function tradeValueForPick(pick: DraftPickAsset, teams: LeagueTeam[], currentSeason: string) {
  const originalTeam = teams.find((team) => team.rosterId === pick.originalRosterId);
  let tier = projectedPickTier(originalTeam, teams);
  let value = basePickValue(pick.round, tier);
  const yearsAway = Math.max(0, Number(pick.season) - Number(currentSeason));
  value *= Math.pow(pick.round === 1 ? 0.88 : 0.82, yearsAway);
  if (pick.draftSlot && teams.length) {
    const slotRatio = pick.draftSlot / teams.length;
    tier = slotRatio <= 0.34 ? "early" : slotRatio >= 0.67 ? "late" : "mid";
    value = basePickValue(pick.round, tier) * Math.pow(pick.round === 1 ? 0.88 : 0.82, yearsAway);
    if (pick.round === 1 && pick.draftSlot === 1) value = 9200 * Math.pow(0.88, yearsAway);
    else if (pick.round === 1 && pick.draftSlot <= 3) value += 700;
  }
  const lockedValue = roundTo(Math.max(1, value));
  const confidence: ValueConfidence = pick.draftSlot ? "High" : "Medium";
  return { value: lockedValue, ...rangeFor(lockedValue, confidence), tier, confidence };
}
