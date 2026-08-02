"use client";

import { useEffect, useMemo, useState } from "react";
import { demoPlayerPositions } from "@/lib/demo-data";
import type {
  LeagueProvider,
  LeagueTeam,
  PlayerIntelligencePayload,
  PlayerProfile
} from "@/lib/types";

export function RosterSnapshot({
  team,
  source,
  intelligence
}: {
  team: LeagueTeam;
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
    const ids = team.players.slice(0, 100);
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

  const starterIds = useMemo(() => new Set(team.starters), [team.starters]);
  const snapshotMap = useMemo(
    () => new Map((intelligence?.currentSnapshots || []).map((snapshot) => [snapshot.playerId, snapshot])),
    [intelligence?.currentSnapshots]
  );
  const rows = useMemo(() => {
    return team.players
      .map((playerId) => {
        const profile = playersById[playerId];
        const snapshot = snapshotMap.get(playerId);
        const isStarter = starterIds.has(playerId);
        return {
          playerId,
          isStarter,
          fullName: source === "demo" ? playerId : profile?.fullName || snapshot?.playerName || playerId,
          position: source === "demo" ? demoPlayerPositions[playerId] || "—" : profile?.position || snapshot?.position || "—",
          nflTeam: source === "demo" ? null : profile?.team || snapshot?.nflTeam || null,
          status: source === "demo" ? null : profile?.injuryStatus || profile?.status || null,
          projectedPoints: snapshot?.projectedPoints ?? null,
          previousActualPoints: snapshot?.previousActualPoints ?? null,
          recentError: snapshot?.recentError ?? null
        };
      })
      .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || a.position.localeCompare(b.position) || a.fullName.localeCompare(b.fullName));
  }, [playersById, snapshotMap, source, starterIds, team.players]);

  const positionCounts = useMemo(() => rows.reduce<Record<string, number>>((counts, player) => {
    counts[player.position] = (counts[player.position] || 0) + 1;
    return counts;
  }, {}), [rows]);

  return (
    <section className="panel roster-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">Roster room</span><h2>{team.teamName}</h2></div>
        <div className="position-pills">
          {Object.entries(positionCounts).filter(([position]) => position !== "—").map(([position, count]) => <span key={position}>{position} {count}</span>)}
        </div>
      </div>

      {loading && <div className="roster-state">Loading player details…</div>}
      {error && <div className="roster-state error">{error}</div>}
      {!loading && !rows.length && <div className="roster-state">No roster data is available yet.</div>}

      {!!rows.length && (
        <div className="roster-grid">
          {rows.map((player) => (
            <article className={player.isStarter ? "roster-player starter" : "roster-player"} key={player.playerId}>
              <span className="position-badge">{player.position}</span>
              <div className="roster-player-copy">
                <strong>{player.fullName}</strong>
                <small>{player.isStarter ? "Starter" : "Bench"}{player.nflTeam ? ` · ${player.nflTeam}` : ""}{player.status ? ` · ${player.status}` : ""}</small>
              </div>
              {player.projectedPoints !== null && (
                <div className="roster-player-points">
                  <strong>{player.projectedPoints.toFixed(1)}</strong><span>projected</span>
                  {player.previousActualPoints !== null && <small>Last: {player.previousActualPoints.toFixed(1)}{player.recentError !== null ? ` (${player.recentError >= 0 ? "+" : ""}${player.recentError.toFixed(1)} vs proj.)` : ""}</small>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
