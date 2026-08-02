"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { demoPlayerPositions } from "@/lib/demo-data";
import type {
  ImportedLeague,
  LeagueProvider,
  LeagueTeam,
  PlayerIntelligencePayload,
  PlayerProfile
} from "@/lib/types";

const NON_STARTER_SLOTS = new Set(["BN", "BE", "BENCH", "IR", "IR+", "TAXI", "NA"]);

function cleanSlot(slot: string | undefined, fallback: string) {
  if (!slot) return fallback;
  const normalized = slot.toUpperCase();
  if (normalized === "SUPER_FLEX" || normalized === "SF" || normalized === "OP") return "SUPERFLEX";
  if (["WRT", "WRRB_FLEX", "REC_FLEX", "FLEX"].includes(normalized)) return "FLEX";
  if (normalized === "D/ST") return "DEF";
  return normalized;
}

function statusClass(status: string | null) {
  const value = (status || "").toLowerCase();
  if (value.includes("out") || value.includes("ir") || value.includes("pup") || value.includes("suspend")) return "danger";
  if (value.includes("question") || value.includes("doubt")) return "warning";
  return "";
}

export function RosterSnapshot({
  team,
  league,
  source,
  intelligence
}: {
  team: LeagueTeam;
  league: ImportedLeague;
  source: LeagueProvider;
  intelligence?: PlayerIntelligencePayload | null;
}) {
  const [playersById, setPlayersById] = useState<Record<string, PlayerProfile>>(
    intelligence?.profiles || team.playerProfiles || {}
  );
  const [loading, setLoading] = useState(source === "sleeper" && !intelligence);
  const [error, setError] = useState("");

  useEffect(() => {
    if (intelligence) {
      setPlayersById({ ...(team.playerProfiles || {}), ...intelligence.profiles });
      setLoading(false);
      setError("");
      return;
    }
    if (source === "yahoo") {
      setPlayersById(team.playerProfiles || {});
      setLoading(false);
      setError("");
      return;
    }
    if (source !== "sleeper") {
      setLoading(false);
      setError("");
      setPlayersById({});
      return;
    }

    const controller = new AbortController();
    const ids = team.players.slice(0, 120);
    setLoading(true);
    setError("");
    fetch("/api/sleeper/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load player names.");
        return payload as { players: Record<string, PlayerProfile> };
      })
      .then((payload) => setPlayersById(payload.players))
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load player names.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [intelligence, source, team.playerProfiles, team.players, team.rosterId]);

  const snapshotMap = useMemo(
    () => new Map((intelligence?.currentSnapshots || []).map((snapshot) => [snapshot.playerId, snapshot])),
    [intelligence?.currentSnapshots]
  );

  const playerRow = (playerId: string, lineupSlot: string, group: "starter" | "bench" | "taxi" | "reserve") => {
    const profile = playersById[playerId];
    const snapshot = snapshotMap.get(playerId);
    return {
      playerId,
      lineupSlot,
      group,
      fullName: source === "demo" ? playerId : profile?.fullName || snapshot?.playerName || playerId,
      position: source === "demo" ? demoPlayerPositions[playerId] || "—" : profile?.position || snapshot?.position || "—",
      nflTeam: source === "demo" ? null : profile?.team || snapshot?.nflTeam || null,
      status: source === "demo" ? null : profile?.injuryStatus || profile?.status || null,
      projectedPoints: snapshot?.projectedPoints ?? null,
      previousActualPoints: snapshot?.previousActualPoints ?? null,
      recentError: snapshot?.recentError ?? null
    };
  };

  const groups = useMemo(() => {
    const starterSlots = league.rosterPositions.filter((slot) => !NON_STARTER_SLOTS.has(slot.toUpperCase()));
    const validStarters = team.starters.filter((playerId) => playerId && playerId !== "0");
    const starterSet = new Set(validStarters);
    const reserveSet = new Set(team.reserve || []);
    const taxiSet = new Set(team.taxi || []);
    const starters = validStarters.map((playerId, index) => {
      const fallback = source === "demo" ? demoPlayerPositions[playerId] || "START" : playersById[playerId]?.position || "START";
      return playerRow(playerId, cleanSlot(starterSlots[index], fallback), "starter");
    });
    const nonStarters = team.players.filter((playerId) => !starterSet.has(playerId));
    const reserve = nonStarters.filter((id) => reserveSet.has(id)).map((id) => playerRow(id, "IR", "reserve"));
    const taxi = nonStarters.filter((id) => taxiSet.has(id)).map((id) => playerRow(id, "TAXI", "taxi"));
    const bench = nonStarters
      .filter((id) => !reserveSet.has(id) && !taxiSet.has(id))
      .map((id) => playerRow(id, "BN", "bench"))
      .sort((a, b) => (b.projectedPoints ?? -1) - (a.projectedPoints ?? -1) || a.position.localeCompare(b.position));
    return { starters, bench, taxi, reserve };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.rosterPositions, playersById, snapshotMap, source, team.players, team.reserve, team.starters, team.taxi]);

  const lowestStarterProjection = Math.min(...groups.starters.map((row) => row.projectedPoints ?? Number.POSITIVE_INFINITY));

  function LineupSection({ title, rows }: { title: string; rows: ReturnType<typeof playerRow>[] }) {
    if (!rows.length) return null;
    return (
      <div className="lineup-section">
        <div className="lineup-section-heading"><h3>{title}</h3><span>{rows.length} players</span></div>
        <div className="lineup-list">
          {rows.map((player) => {
            const possibleUpgrade = player.group === "bench" && player.projectedPoints !== null && Number.isFinite(lowestStarterProjection) && player.projectedPoints > lowestStarterProjection + 1;
            return (
              <article className={`lineup-row ${player.group}${possibleUpgrade ? " possible-upgrade" : ""}`} key={`${player.group}-${player.playerId}`}>
                <span className="lineup-slot">{player.lineupSlot}</span>
                <div className="lineup-player-main">
                  <strong>{player.fullName}</strong>
                  <small>{player.position}{player.nflTeam ? ` · ${player.nflTeam}` : ""}{player.status ? ` · ${player.status}` : ""}</small>
                  {possibleUpgrade && <em>Review start/sit: projects above at least one current starter.</em>}
                </div>
                {player.status && <span className={`lineup-status ${statusClass(player.status)}`}>{player.status}</span>}
                <div className="lineup-projection">
                  <strong>{player.projectedPoints === null ? "—" : player.projectedPoints.toFixed(2)}</strong>
                  <span>projected</span>
                  {player.previousActualPoints !== null && <small>Last: {player.previousActualPoints.toFixed(2)}{player.recentError !== null ? ` (${player.recentError >= 0 ? "+" : ""}${player.recentError.toFixed(2)})` : ""}</small>}
                </div>
                <Link className="lineup-trade-link" href={`/trade-lab?player=${encodeURIComponent(player.playerId)}`}>Trade Lab</Link>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  const totalPlayers = groups.starters.length + groups.bench.length + groups.taxi.length + groups.reserve.length;

  return (
    <section className="panel roster-panel vertical-lineup-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">Your lineup</span><h2>{team.teamName}</h2><p>Imported lineup order with starters, bench, taxi squad, and injured reserve separated.</p></div>
        <span className="pill">{totalPlayers} rostered</span>
      </div>

      {loading && <div className="roster-state">Loading player details…</div>}
      {error && <div className="roster-state error">{error}</div>}
      {!loading && !totalPlayers && <div className="roster-state">No roster data is available yet.</div>}

      {!!totalPlayers && <div className="vertical-lineup"><LineupSection title="Starting lineup" rows={groups.starters} /><LineupSection title="Bench" rows={groups.bench} /><LineupSection title="Taxi squad" rows={groups.taxi} /><LineupSection title="Injured reserve" rows={groups.reserve} /></div>}
    </section>
  );
}
