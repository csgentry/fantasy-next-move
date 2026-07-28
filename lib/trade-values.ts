import type { PlayerProfile } from "./types";

export type TradeFormat = "redraft" | "dynasty";
export type ValueConfidence = "High" | "Medium" | "Limited";

export type TradeValueContext = {
  rosterPositions: string[];
  scoringSettings: Record<string, number>;
};

export type TradeValueResult = {
  value: number;
  confidence: ValueConfidence;
  position: string;
};

const REDRAFT_BASE: Record<string, number> = {
  QB: 27,
  RB: 34,
  WR: 33,
  TE: 26,
  K: 4,
  DEF: 5,
  DST: 5
};

const DYNASTY_BASE: Record<string, number> = {
  QB: 31,
  RB: 30,
  WR: 35,
  TE: 29,
  K: 2,
  DEF: 2,
  DST: 2
};

export function normalizePosition(position: string | null | undefined) {
  const first = (position || "—").split(/[,/]/)[0]?.trim().toUpperCase() || "—";
  if (first === "D/ST") return "DEF";
  return first;
}

export function isSuperflex(rosterPositions: string[]) {
  return rosterPositions.some((position) => ["SUPER_FLEX", "SF", "OP", "Q/W/R/T", "FLEX_QB"].includes(position.toUpperCase()));
}

function isTightEndPremium(scoringSettings: Record<string, number>) {
  return Object.entries(scoringSettings).some(([key, value]) => key.toLowerCase().includes("te") && key.toLowerCase().includes("rec") && Number(value) > 0);
}

function rankAdjustment(rank: number | null | undefined) {
  if (!rank || rank <= 0) return 0;
  if (rank <= 10) return 29;
  if (rank <= 25) return 23;
  if (rank <= 50) return 17;
  if (rank <= 90) return 11;
  if (rank <= 150) return 6;
  if (rank <= 250) return 2;
  return 0;
}

function dynastyAgeAdjustment(position: string, age: number | null | undefined) {
  if (!age || age < 18 || age > 50) return 0;

  if (position === "QB") {
    if (age <= 26) return 10;
    if (age <= 30) return 7;
    if (age <= 33) return 3;
    if (age <= 35) return -2;
    return -7;
  }

  if (position === "RB") {
    if (age <= 23) return 13;
    if (age <= 25) return 8;
    if (age === 26) return 3;
    if (age === 27) return -2;
    if (age === 28) return -7;
    return -13;
  }

  if (position === "WR") {
    if (age <= 23) return 11;
    if (age <= 26) return 8;
    if (age <= 28) return 4;
    if (age <= 30) return 0;
    if (age === 31) return -5;
    return -9;
  }

  if (position === "TE") {
    if (age <= 24) return 9;
    if (age <= 28) return 6;
    if (age <= 30) return 2;
    if (age === 31) return -2;
    return -6;
  }

  return 0;
}

function statusAdjustment(status: string | null, format: TradeFormat) {
  if (!status) return 0;
  const normalized = status.toLowerCase();
  if (["active", "healthy", "probable"].includes(normalized)) return 0;
  if (normalized.includes("out") || normalized.includes("ir") || normalized.includes("pup")) return format === "redraft" ? -9 : -4;
  if (normalized.includes("doubtful")) return format === "redraft" ? -6 : -3;
  if (normalized.includes("questionable")) return format === "redraft" ? -3 : -1;
  return format === "redraft" ? -2 : -1;
}

export function tradeValueForPlayer(
  profile: PlayerProfile,
  starter: boolean,
  format: TradeFormat,
  context: TradeValueContext
): TradeValueResult {
  const position = normalizePosition(profile.position);
  const base = (format === "dynasty" ? DYNASTY_BASE : REDRAFT_BASE)[position] ?? 13;
  let value = base;

  value += rankAdjustment(profile.searchRank);
  value += starter ? (format === "redraft" ? 9 : 7) : 0;
  value += statusAdjustment(profile.status, format);

  if (format === "dynasty") {
    value += dynastyAgeAdjustment(position, profile.age);
    if (profile.yearsExperience !== null && profile.yearsExperience !== undefined && profile.yearsExperience <= 1) value += 3;
  }

  if (position === "QB" && isSuperflex(context.rosterPositions)) value += format === "dynasty" ? 17 : 14;
  if (position === "TE" && isTightEndPremium(context.scoringSettings)) value += 5;

  const confidence: ValueConfidence = profile.searchRank && profile.age
    ? "High"
    : profile.searchRank || profile.age
      ? "Medium"
      : "Limited";

  return {
    value: Math.max(1, Math.min(100, Math.round(value))),
    confidence,
    position
  };
}
