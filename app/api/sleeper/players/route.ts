import { NextRequest, NextResponse } from "next/server";
import type { PlayerProfile } from "@/lib/types";

const PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const MAX_IDS = 500;

type SleeperPlayer = {
  player_id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  team?: string | null;
  status?: string | null;
  age?: number | null;
  years_exp?: number | null;
  search_rank?: number | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ids?: unknown };
    if (!Array.isArray(body.ids)) {
      return NextResponse.json({ error: "Player IDs must be an array." }, { status: 400 });
    }

    const ids = [...new Set(body.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))].slice(0, MAX_IDS);
    if (!ids.length) return NextResponse.json({ players: {} });

    const response = await fetch(PLAYERS_URL, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`Sleeper player request failed (${response.status}).`);
    const allPlayers = (await response.json()) as Record<string, SleeperPlayer>;

    const players = ids.reduce<Record<string, PlayerProfile>>((result, playerId) => {
      const player = allPlayers[playerId];
      if (!player) {
        result[playerId] = {
          playerId,
          fullName: playerId,
          position: /^[A-Z]{2,3}$/.test(playerId) ? "DEF" : "—",
          team: null,
          status: null,
          age: null,
          yearsExperience: null,
          searchRank: null
        };
        return result;
      }
      const fullName = player.full_name || [player.first_name, player.last_name].filter(Boolean).join(" ") || playerId;
      result[playerId] = {
        playerId,
        fullName,
        position: player.position || "—",
        team: player.team || null,
        status: player.status || null,
        age: Number.isFinite(player.age) ? player.age ?? null : null,
        yearsExperience: Number.isFinite(player.years_exp) ? player.years_exp ?? null : null,
        searchRank: Number.isFinite(player.search_rank) ? player.search_rank ?? null : null
      };
      return result;
    }, {});

    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Sleeper players." }, { status: 502 });
  }
}
