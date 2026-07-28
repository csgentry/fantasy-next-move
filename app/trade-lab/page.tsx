"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { demoPlayerPositions } from "@/lib/demo-data";
import type { LeagueTeam, PlayerProfile } from "@/lib/types";

type Asset = {
  playerId: string;
  name: string;
  position: string;
  nflTeam: string | null;
  rosterId: number;
  teamName: string;
  starter: boolean;
  value: number;
};

const BASE_VALUES: Record<string, number> = {
  QB: 32,
  RB: 40,
  WR: 39,
  TE: 30,
  FLEX: 24,
  K: 7,
  DEF: 8,
  DST: 8
};

function baselineValue(position: string, starter: boolean, status: string | null) {
  const injuryPenalty = status && !["Active", "active"].includes(status) ? 4 : 0;
  return Math.max(1, (BASE_VALUES[position] ?? 18) + (starter ? 7 : 0) - injuryPenalty);
}

function requiredPositions(rosterPositions: string[]) {
  const counts: Record<string, number> = {};
  rosterPositions.filter((position) => !["BN", "IR", "IR+", "TAXI", "NA", "K", "DEF", "DST"].includes(position)).forEach((position) => {
    if (["FLEX", "WRT", "WRRB_FLEX", "REC_FLEX", "SUPER_FLEX", "SUPER_FLEX"].includes(position)) return;
    counts[position] = (counts[position] || 0) + 1;
  });
  return counts;
}

function positionCounts(team: LeagueTeam, profiles: Record<string, PlayerProfile>, outgoing: Asset[], incoming: Asset[]) {
  const outgoingIds = new Set(outgoing.map((asset) => asset.playerId));
  const counts: Record<string, number> = {};
  team.players.filter((playerId) => !outgoingIds.has(playerId)).forEach((playerId) => {
    const position = profiles[playerId]?.position || "—";
    counts[position] = (counts[position] || 0) + 1;
  });
  incoming.forEach((asset) => { counts[asset.position] = (counts[asset.position] || 0) + 1; });
  return counts;
}

function fitScore(team: LeagueTeam, profiles: Record<string, PlayerProfile>, requirements: Record<string, number>, outgoing: Asset[], incoming: Asset[]) {
  const counts = positionCounts(team, profiles, outgoing, incoming);
  return Object.entries(requirements).reduce((score, [position, required]) => {
    const count = counts[position] || 0;
    if (count < required) return score - (required - count) * 7;
    return score + Math.min(count - required, 2);
  }, 0);
}

function TradeSide({
  title,
  available,
  selected,
  onAdd,
  onRemove,
  onValueChange
}: {
  title: string;
  available: Asset[];
  selected: Asset[];
  onAdd: (asset: Asset) => void;
  onRemove: (playerId: string) => void;
  onValueChange: (playerId: string, value: number) => void;
}) {
  return (
    <div className="trade-side">
      <h2>{title}</h2>
      <select defaultValue="" onChange={(event) => {
        const asset = available.find((item) => item.playerId === event.target.value);
        if (asset) onAdd(asset);
        event.target.value = "";
      }}>
        <option value="" disabled>Add a player</option>
        {available.map((asset) => <option key={asset.playerId} value={asset.playerId}>{asset.name} · {asset.position} · {asset.value}</option>)}
      </select>
      <div className="trade-assets">
        {selected.map((asset) => (
          <article className="trade-asset" key={asset.playerId}>
            <button className="asset-remove" onClick={() => onRemove(asset.playerId)} aria-label={`Remove ${asset.name}`}>×</button>
            <div><b>{asset.name}</b><small>{asset.position}{asset.nflTeam ? ` · ${asset.nflTeam}` : ""}{asset.starter ? " · Starter" : " · Bench"}</small></div>
            <label><span>Value</span><input type="number" min="1" max="100" value={asset.value} onChange={(event) => onValueChange(asset.playerId, Number(event.target.value) || 1)} /></label>
          </article>
        ))}
        {!selected.length && <div className="empty-slot">Add players to this side</div>}
      </div>
    </div>
  );
}

export default function TradeLabPage() {
  const { league, source, teamRosterId } = useSelectedLeague();
  const [teamAId, setTeamAId] = useState(teamRosterId);
  const [teamBId, setTeamBId] = useState(league.teams.find((team) => team.rosterId !== teamRosterId)?.rosterId ?? teamRosterId);
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [sideA, setSideA] = useState<Asset[]>([]);
  const [sideB, setSideB] = useState<Asset[]>([]);

  useEffect(() => {
    setTeamAId(teamRosterId);
    setTeamBId(league.teams.find((team) => team.rosterId !== teamRosterId)?.rosterId ?? teamRosterId);
    setSideA([]);
    setSideB([]);
  }, [league.leagueId, teamRosterId, league.teams]);

  useEffect(() => {
    const embedded = league.teams.reduce<Record<string, PlayerProfile>>((all, team) => ({ ...all, ...(team.playerProfiles || {}) }), {});
    if (source === "yahoo") {
      setProfiles(embedded);
      return;
    }
    if (source === "demo") {
      const demoProfiles = Object.fromEntries(league.teams.flatMap((team) => team.players.map((name) => [name, { playerId: name, fullName: name, position: demoPlayerPositions[name] || "—", team: null, status: null }] as const)));
      setProfiles(demoProfiles);
      return;
    }

    const ids = [...new Set(league.teams.flatMap((team) => team.players))];
    let cancelled = false;
    setLoadingPlayers(true);
    Promise.all(Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, index * 100 + 100)).map(async (chunk) => {
      const response = await fetch("/api/sleeper/players", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: chunk }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load player data.");
      return payload.players as Record<string, PlayerProfile>;
    })).then((chunks) => {
      if (!cancelled) setProfiles(Object.assign({}, ...chunks));
    }).finally(() => { if (!cancelled) setLoadingPlayers(false); });
    return () => { cancelled = true; };
  }, [league, source]);

  const teamA = league.teams.find((team) => team.rosterId === teamAId) || league.teams[0];
  const teamB = league.teams.find((team) => team.rosterId === teamBId) || league.teams[1] || league.teams[0];

  const assets = useMemo(() => league.teams.flatMap((team) => team.players.map((playerId) => {
    const profile = profiles[playerId];
    const starter = team.starters.includes(playerId);
    return {
      playerId,
      name: profile?.fullName || playerId,
      position: profile?.position || "—",
      nflTeam: profile?.team || null,
      rosterId: team.rosterId,
      teamName: team.teamName,
      starter,
      value: baselineValue(profile?.position || "—", starter, profile?.status || null)
    } satisfies Asset;
  })), [league.teams, profiles]);

  const availableForA = assets.filter((asset) => asset.rosterId === teamB.rosterId && !sideA.some((selected) => selected.playerId === asset.playerId));
  const availableForB = assets.filter((asset) => asset.rosterId === teamA.rosterId && !sideB.some((selected) => selected.playerId === asset.playerId));
  const requirements = requiredPositions(league.rosterPositions);
  const beforeFitA = fitScore(teamA, profiles, requirements, [], []);
  const beforeFitB = fitScore(teamB, profiles, requirements, [], []);
  const afterFitA = fitScore(teamA, profiles, requirements, sideB, sideA);
  const afterFitB = fitScore(teamB, profiles, requirements, sideA, sideB);
  const fitDeltaA = afterFitA - beforeFitA;
  const fitDeltaB = afterFitB - beforeFitB;
  const rawA = sideA.reduce((sum, asset) => sum + asset.value, 0);
  const rawB = sideB.reduce((sum, asset) => sum + asset.value, 0);
  const adjustedA = rawA + fitDeltaA;
  const adjustedB = rawB + fitDeltaB;
  const difference = adjustedA - adjustedB;
  const verdict = !sideA.length || !sideB.length ? "Add both sides" : Math.abs(difference) <= 4 ? "Balanced trade" : difference > 0 ? `${teamA.teamName} gains more` : `${teamB.teamName} gains more`;

  function updateValue(setter: Dispatch<SetStateAction<Asset[]>>, playerId: string, value: number) {
    setter((current) => current.map((asset) => asset.playerId === playerId ? { ...asset, value } : asset));
  }

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Roster-aware decision engine</span><h1>Trade Lab</h1><p>Compare custom player values, then adjust the result for each roster&apos;s positional needs.</p></div><span className="pill">{source === "demo" ? "Demo values" : `${source} rosters`}</span></div>

      <div className="team-pair-panel panel">
        <label><span>Team A</span><select value={teamA.rosterId} onChange={(event) => { setTeamAId(Number(event.target.value)); setSideB([]); }}>{league.teams.filter((team) => team.rosterId !== teamBId).map((team) => <option value={team.rosterId} key={team.rosterId}>{team.teamName} · {team.ownerName}</option>)}</select></label>
        <span className="trade-arrow">↔</span>
        <label><span>Team B</span><select value={teamB.rosterId} onChange={(event) => { setTeamBId(Number(event.target.value)); setSideA([]); }}>{league.teams.filter((team) => team.rosterId !== teamAId).map((team) => <option value={team.rosterId} key={team.rosterId}>{team.teamName} · {team.ownerName}</option>)}</select></label>
      </div>

      {loadingPlayers && <div className="connection-message">Loading league players…</div>}
      <div className="trade-grid">
        <TradeSide title={`${teamA.teamName} receives`} available={availableForA} selected={sideA} onAdd={(asset) => setSideA((current) => [...current, asset])} onRemove={(playerId) => setSideA((current) => current.filter((asset) => asset.playerId !== playerId))} onValueChange={(playerId, value) => updateValue(setSideA, playerId, value)} />
        <div className="trade-verdict"><span>Verdict</span><strong>{verdict}</strong><div><b>{adjustedA}</b><i>vs.</i><b>{adjustedB}</b></div><p>Market inputs: {rawA}–{rawB}<br />Roster-fit adjustment: {fitDeltaA >= 0 ? "+" : ""}{fitDeltaA} / {fitDeltaB >= 0 ? "+" : ""}{fitDeltaB}</p></div>
        <TradeSide title={`${teamB.teamName} receives`} available={availableForB} selected={sideB} onAdd={(asset) => setSideB((current) => [...current, asset])} onRemove={(playerId) => setSideB((current) => current.filter((asset) => asset.playerId !== playerId))} onValueChange={(playerId, value) => updateValue(setSideB, playerId, value)} />
      </div>
      <div className="panel analysis-panel"><h2>How to use this honestly</h2><p>The default number is a transparent roster-role baseline—not a claim that FantasyNextMove already has a licensed live market-value feed. Adjust each player&apos;s value to match your preferred rankings. The app then adds roster-fit impact using your connected league&apos;s lineup requirements.</p></div>
    </AppShell>
  );
}
