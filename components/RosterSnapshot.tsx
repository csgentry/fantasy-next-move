"use client";

import { useEffect, useMemo, useState } from "react";
import { demoPlayerPositions } from "@/lib/demo-data";
import type { LeagueProvider, LeagueTeam, PlayerProfile } from "@/lib/types";

export function RosterSnapshot({ team, source }: { team: LeagueTeam; source: LeagueProvider }) {
  const [playersById, setPlayersById] = useState<Record<string, PlayerProfile>>(team.playerProfiles || {});
  const [loading, setLoading] = useState(source === "sleeper");
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [source, team.rosterId, team.players, team.playerProfiles]);

  const starterIds = useMemo(() => new Set(team.starters), [team.starters]);
  const rows = useMemo(() => {
    return team.players
      .map((playerId) => {
        const profile = playersById[playerId];
        const isStarter = starterIds.has(playerId);
        return {
          playerId,
          isStarter,
          fullName: source === "demo" ? playerId : profile?.fullName || playerId,
          position: source === "demo" ? demoPlayerPositions[playerId] || "—" : profile?.position || "—",
          nflTeam: source === "demo" ? null : profile?.team || null,
          status: source === "demo" ? null : profile?.status || null
        };
      })
      .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || a.position.localeCompare(b.position) || a.fullName.localeCompare(b.fullName));
  }, [playersById, source, starterIds, team.players]);

  const positionCounts = useMemo(() => {
    return rows.reduce<Record<string, number>>((counts, player) => {
      counts[player.position] = (counts[player.position] || 0) + 1;
      return counts;
    }, {});
  }, [rows]);

  return (
    <section className="panel roster-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">Roster room</span><h2>{team.teamName}</h2></div>
        <div className="position-pills">
          {Object.entries(positionCounts).filter(([position]) => position !== "—").map(([position, count]) => (
            <span key={position}>{position} {count}</span>
          ))}
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
              <div><strong>{player.fullName}</strong><small>{player.isStarter ? "Starter" : "Bench"}{player.nflTeam ? ` · ${player.nflTeam}` : ""}{player.status ? ` · ${player.status}` : ""}</small></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
