"use client";

import {PlayerDetails} from "./PlayerDetails";
import {lineupEligibility} from "@/lib/player-intelligence";
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

export function RosterSnapshot({
  team,
  league,
  source,
  intelligence,
  view="roster"
}: {
  team: LeagueTeam;
  league: ImportedLeague;
  source: LeagueProvider;
  intelligence?: PlayerIntelligencePayload | null;
  view?: "roster"|"projections"|"stats";
}) {
  const requestKey = `${source}:${team.rosterId}:${team.players.join(",")}`;
  const [remote, setRemote] = useState<{key:string;players:Record<string,PlayerProfile>;error:string}|null>(null);
  const needsFetch = source === "sleeper" && !intelligence;
  const current = remote?.key === requestKey ? remote : null;
  const playersById = useMemo(() => ({...(team.playerProfiles || {}), ...(intelligence?.profiles || (needsFetch ? current?.players : {}) || {})}), [team.playerProfiles, intelligence, needsFetch, current]);
  const loading = needsFetch && !current;
  const error = current?.error || "";
  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    let cancelled = false;
    fetch("/api/sleeper/players", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ids:team.players.slice(0,120)}), signal:controller.signal})
      .then(async response => {const payload = await response.json(); if (!response.ok) throw Error(payload.error || "Unable to load player names."); return payload as {players:Record<string,PlayerProfile>};})
      .then(payload => {if(!cancelled) setRemote({key:requestKey, players:payload.players, error:""});})
      .catch(error => {if(!cancelled) setRemote({key:requestKey, players:{}, error:error instanceof Error ? error.message : "Unable to load player names."});});
    return () => {cancelled=true; controller.abort();};
  }, [needsFetch, requestKey, team.players]);

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
      fullName: source === "demo" ? playerId : profile?.fullName || snapshot?.playerName || "Player details unavailable",
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
    const starters = team.starters.map((playerId, index) => {
      if (!playerId || playerId === "0") return null;
      const fallback = source === "demo" ? demoPlayerPositions[playerId] || "START" : playersById[playerId]?.position || "START";
      return playerRow(playerId, cleanSlot(source === "yahoo" ? playersById[playerId]?.selectedPosition || undefined : starterSlots[index], fallback), "starter");
    }).filter((row): row is NonNullable<typeof row> => Boolean(row));
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


  function renderLineupSection({ title, rows }: { title: string; rows: ReturnType<typeof playerRow>[] }) {
    if (!rows.length) return null;
    return (
      <div className="lineup-section">
        <div className="lineup-section-heading"><h3>{title}</h3><span>{rows.length} players</span></div>
        <div className="lineup-list">
          {rows.map((player) => {
            const possibleUpgrade = player.group === "bench" && player.projectedPoints !== null && groups.starters.some((starter, index) => starter.projectedPoints !== null && lineupEligibility(league.rosterPositions.filter(slot => !NON_STARTER_SLOTS.has(slot.toUpperCase()))[team.starters.indexOf(starter.playerId)] || groups.starters[index].lineupSlot).has(player.position) && player.projectedPoints! > starter.projectedPoints + 1);
            return (
              <article className={`lineup-row ${player.group}${possibleUpgrade ? " possible-upgrade" : ""}`} key={`${player.group}-${player.playerId}`}>
                <span className="lineup-slot">{player.lineupSlot}</span>
                <div className="lineup-player-main">
                  <PlayerDetails profile={playersById[player.playerId] || {playerId:player.playerId,fullName:player.fullName,position:player.position,team:player.nflTeam,status:player.status}} snapshot={snapshotMap.get(player.playerId)} source={source}/>
                  <small>{player.position}{player.nflTeam ? ` · ${player.nflTeam}` : ""}{player.status ? ` · ${player.status}` : ""}</small>
                  {possibleUpgrade && <em>Review start/sit: projects above a position-eligible starter.</em>}
                </div>

                <div className="lineup-projection">
                  <strong>{view === "stats" ? (player.previousActualPoints == null ? "—" : player.previousActualPoints.toFixed(1)) : player.projectedPoints === null ? "—" : player.projectedPoints.toFixed(1)}</strong>
                  <span>{view === "stats" ? "last scored week" : "projected"}</span>

                </div>

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
        <div><h2>{view === "stats" ? "Recent fantasy points" : view === "projections" ? `Week ${intelligence?.projectionWeek || "—"} projections` : "Roster"}</h2></div>
        <span className="pill">{totalPlayers} rostered</span>
      </div>

      {loading && <div className="roster-state">Loading player details…</div>}
      {error && <div className="roster-state error">{error}</div>}
      {!loading && !totalPlayers && <div className="roster-state">No roster data is available yet.</div>}

      {!!totalPlayers && <div className="vertical-lineup">{renderLineupSection({title: "Starting lineup", rows: groups.starters})}{renderLineupSection({title: "Bench", rows: groups.bench})}{renderLineupSection({title: "Taxi squad", rows: groups.taxi})}{renderLineupSection({title: "Injured reserve", rows: groups.reserve})}</div>}
    </section>
  );
}
