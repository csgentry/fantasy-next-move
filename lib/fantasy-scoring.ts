import type {
  FantasyScoreResult,
  FantasyScoringContribution,
  NumericStatLine
} from "./types";

const SKIP_DIRECT_KEYS = new Set([
  "bonus_rec_te",
  "bonus_rec_rb",
  "bonus_rec_wr",
  "bonus_rec_qb"
]);

function finite(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value: number, places = 2) {
  const multiplier = 10 ** places;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function labelFor(key: string) {
  return key
    .replace(/^bonus_/, "Bonus: ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function thresholdBonus(
  key: string,
  rate: number,
  stats: NumericStatLine
): FantasyScoringContribution | null {
  const match = key.match(/^bonus_(pass|rush|rec)_yd_(\d+)$/);
  if (!match) return null;
  const statKey = `${match[1]}_yd`;
  const threshold = Number(match[2]);
  const yards = finite(stats[statKey]);
  if (yards < threshold) return null;
  return {
    key,
    label: labelFor(key),
    statValue: 1,
    multiplier: rate,
    points: round(rate)
  };
}

function positionReceptionBonus(
  key: string,
  rate: number,
  stats: NumericStatLine,
  position: string | null | undefined
): FantasyScoringContribution | null {
  const match = key.match(/^bonus_rec_(qb|rb|wr|te)$/);
  if (!match || match[1].toUpperCase() !== (position || "").toUpperCase()) return null;
  const receptions = finite(stats.rec);
  if (!receptions) return null;
  return {
    key,
    label: labelFor(key),
    statValue: receptions,
    multiplier: rate,
    points: round(receptions * rate)
  };
}

function firstDefined(stats: NumericStatLine, keys: string[]) {
  for (const key of keys) {
    if (Number.isFinite(Number(stats[key]))) return finite(stats[key]);
  }
  return 0;
}

function derivedAliasValue(key: string, stats: NumericStatLine) {
  const aliases: Record<string, string[]> = {
    pass_2pt: ["pass_2pt", "pass_2pt_conv"],
    rush_2pt: ["rush_2pt", "rush_2pt_conv"],
    rec_2pt: ["rec_2pt", "rec_2pt_conv"],
    fum_lost: ["fum_lost", "fumbles_lost"],
    pass_int: ["pass_int", "int"],
    xpm: ["xpm", "pat_made"],
    xpmiss: ["xpmiss", "pat_missed"]
  };
  return aliases[key] ? firstDefined(stats, aliases[key]) : finite(stats[key]);
}

export function calculateFantasyScore(
  rawStats: NumericStatLine | null | undefined,
  scoringSettings: Record<string, number>,
  position?: string | null
): FantasyScoreResult {
  const stats = rawStats || {};
  const contributions: FantasyScoringContribution[] = [];

  Object.entries(scoringSettings).forEach(([key, rawRate]) => {
    const rate = finite(rawRate);
    if (!rate) return;

    if (SKIP_DIRECT_KEYS.has(key)) {
      const contribution = positionReceptionBonus(key, rate, stats, position);
      if (contribution) contributions.push(contribution);
      return;
    }

    if (key.startsWith("bonus_")) {
      const directValue = finite(stats[key]);
      if (directValue) {
        contributions.push({
          key,
          label: labelFor(key),
          statValue: directValue,
          multiplier: rate,
          points: round(directValue * rate)
        });
        return;
      }
      const contribution = thresholdBonus(key, rate, stats);
      if (contribution) contributions.push(contribution);
      return;
    }

    const statValue = derivedAliasValue(key, stats);
    if (!statValue) return;
    const points = round(statValue * rate);
    if (!points) return;
    contributions.push({
      key,
      label: labelFor(key),
      statValue,
      multiplier: rate,
      points
    });
  });

  contributions.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  return {
    total: round(contributions.reduce((sum, item) => sum + item.points, 0)),
    contributions
  };
}
