import type { DraftPickAsset, LeagueTeam, PlayerProfile } from "./types";

export type TradeFormat = "redraft" | "dynasty";
export type ValueConfidence = "High" | "Medium" | "Limited";
export type PickTier = "early" | "mid" | "late";

export type TradeValueContext = {
  rosterPositions: string[];
  scoringSettings: Record<string, number>;
};

export type TradeValueResult = {
  value: number;
  confidence: ValueConfidence;
  position: string;
};

const REDRAFT_BASE: Record<string, number> = { QB: 27, RB: 34, WR: 33, TE: 26, K: 4, DEF: 5, DST: 5 };
const DYNASTY_BASE: Record<string, number> = { QB: 31, RB: 30, WR: 35, TE: 29, K: 2, DEF: 2, DST: 2 };

export function normalizePosition(position: string | null | undefined) {
  const first = (position || "—").split(/[,/]/)[0]?.trim().toUpperCase() || "—";
  return first === "D/ST" ? "DEF" : first;
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
  if (position === "QB") return age <= 26 ? 10 : age <= 30 ? 7 : age <= 33 ? 3 : age <= 35 ? -2 : -7;
  if (position === "RB") return age <= 23 ? 13 : age <= 25 ? 8 : age === 26 ? 3 : age === 27 ? -2 : age === 28 ? -7 : -13;
  if (position === "WR") return age <= 23 ? 11 : age <= 26 ? 8 : age <= 28 ? 4 : age <= 30 ? 0 : age === 31 ? -5 : -9;
  if (position === "TE") return age <= 24 ? 9 : age <= 28 ? 6 : age <= 30 ? 2 : age === 31 ? -2 : -6;
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

export function tradeValueForPlayer(profile: PlayerProfile, starter: boolean, format: TradeFormat, context: TradeValueContext): TradeValueResult {
  const position = normalizePosition(profile.position);
  const base = (format === "dynasty" ? DYNASTY_BASE : REDRAFT_BASE)[position] ?? 13;
  let value = base + rankAdjustment(profile.searchRank) + (starter ? (format === "redraft" ? 9 : 7) : 0) + statusAdjustment(profile.status, format);
  if (format === "dynasty") {
    value += dynastyAgeAdjustment(position, profile.age);
    if (profile.yearsExperience !== null && profile.yearsExperience !== undefined && profile.yearsExperience <= 1) value += 3;
  }
  if (position === "QB" && isSuperflex(context.rosterPositions)) value += format === "dynasty" ? 17 : 14;
  if (position === "TE" && isTightEndPremium(context.scoringSettings)) value += 5;
  const confidence: ValueConfidence = profile.searchRank && profile.age ? "High" : profile.searchRank || profile.age ? "Medium" : "Limited";
  return { value: Math.max(1, Math.min(100, Math.round(value))), confidence, position };
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
    1: { early: 49, mid: 41, late: 34 },
    2: { early: 25, mid: 19, late: 15 },
    3: { early: 12, mid: 9, late: 7 },
    4: { early: 7, mid: 5, late: 4 },
    5: { early: 4, mid: 3, late: 2 }
  };
  return values[Math.min(round, 5)]?.[tier] ?? 2;
}

export function tradeValueForPick(pick: DraftPickAsset, teams: LeagueTeam[], currentSeason: string) {
  const originalTeam = teams.find((team) => team.rosterId === pick.originalRosterId);
  let tier = projectedPickTier(originalTeam, teams);
  let value = basePickValue(pick.round, tier);
  const yearsAway = Math.max(0, Number(pick.season) - Number(currentSeason));
  value -= yearsAway * (pick.round === 1 ? 4 : 2);
  if (pick.draftSlot && teams.length) {
    const slotRatio = pick.draftSlot / teams.length;
    tier = slotRatio <= 0.34 ? "early" : slotRatio >= 0.67 ? "late" : "mid";
    value = basePickValue(pick.round, tier) - yearsAway * (pick.round === 1 ? 4 : 2);
  }
  return { value: Math.max(1, Math.round(value)), tier, confidence: pick.draftSlot ? "High" as const : "Medium" as const };
}
