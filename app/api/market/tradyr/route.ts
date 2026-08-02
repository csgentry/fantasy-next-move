import { NextRequest, NextResponse } from "next/server";
import { marketKey, type MarketValueSignal } from "@/lib/market-values";

export const dynamic = "force-dynamic";

type RawPlayer = Record<string, unknown>;
const API_BASE = "https://api.tradyr.app/v1";

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePlayer(row: RawPlayer): MarketValueSignal | null {
  const name = String(row.name || row.player || row.fullName || "").trim();
  const position = String(row.position || row.pos || "").toUpperCase().trim();
  const value = number(row.composite ?? row.value ?? row.score);
  if (!name || !position || value === null) return null;
  return {
    name,
    position,
    value: Math.max(1, Math.min(9995, Math.round(value))),
    overallRank: number(row.rank ?? row.overallRank ?? row.overall_rank),
    positionRank: number(row.positionRank ?? row.position_rank ?? row.posRank ?? row.pos_rank),
    confidence: number(row.confidence ?? row.confidencePct ?? row.confidence_pct),
    source: "tradyr"
  };
}

async function fetchPlayers(format: "dynasty" | "redraft", numQbs: 1 | 2, tep: boolean) {
  const query = new URLSearchParams({ format, numQbs: String(numQbs), tep: String(tep), limit: "1000" });
  const response = await fetch(`${API_BASE}/players?${query.toString()}`, {
    headers: process.env.TRADYR_API_KEY ? { Authorization: `Bearer ${process.env.TRADYR_API_KEY}` } : undefined,
    next: { revalidate: 21600 }
  });
  if (!response.ok) throw new Error(`Market feed returned ${response.status}.`);
  const payload = await response.json() as { data?: RawPlayer[]; meta?: Record<string, unknown> };
  return {
    players: (payload.data || []).map(normalizePlayer).filter((player): player is MarketValueSignal => Boolean(player)),
    meta: payload.meta || {}
  };
}

export async function GET(request: NextRequest) {
  try {
    const requested = request.nextUrl.searchParams.get("format") || "dynasty";
    const format = requested === "redraft" ? "redraft" : requested === "keeper" ? "keeper" : "dynasty";
    const numQbs: 1 | 2 = request.nextUrl.searchParams.get("numQbs") === "1" ? 1 : 2;
    const tep = request.nextUrl.searchParams.get("tep") === "true";

    if (format !== "keeper") {
      const result = await fetchPlayers(format, numQbs, tep);
      return NextResponse.json({ values: result.players, attribution: "Powered in part by Tradyr", meta: result.meta });
    }

    const [dynasty, redraft] = await Promise.all([fetchPlayers("dynasty", numQbs, tep), fetchPlayers("redraft", numQbs, tep)]);
    const redraftMap = new Map(redraft.players.map((player) => [marketKey(player.name, player.position), player]));
    const blended = dynasty.players.map((player) => {
      const shortTerm = redraftMap.get(marketKey(player.name, player.position));
      if (!shortTerm) return player;
      return {
        ...player,
        value: Math.round(player.value * 0.62 + shortTerm.value * 0.38),
        confidence: player.confidence !== null && shortTerm.confidence !== null
          ? Math.round(player.confidence * 0.62 + shortTerm.confidence * 0.38)
          : player.confidence ?? shortTerm.confidence
      } satisfies MarketValueSignal;
    });
    return NextResponse.json({ values: blended, attribution: "Powered in part by Tradyr", meta: dynasty.meta });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Market values are temporarily unavailable.", values: [] }, { status: 502 });
  }
}
