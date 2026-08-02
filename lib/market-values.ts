export type MarketValueSignal = {
  name: string;
  position: string;
  value: number;
  overallRank: number | null;
  positionRank: number | null;
  confidence: number | null;
  source: "tradyr";
};

export function normalizeMarketName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function marketKey(name: string, position: string | null | undefined) {
  return `${normalizeMarketName(name)}:${String(position || "").toUpperCase()}`;
}
