"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { demoPlayerPositions, tradePlayers } from "@/lib/demo-data";
import { normalizePosition, tradeValueForPick, tradeValueForPlayer } from "@/lib/trade-values";
import type { PickTier, TradeFormat, ValueConfidence } from "@/lib/trade-values";
import type { DraftPickAsset, LeagueTeam, PlayerProfile } from "@/lib/types";

type PlayerAsset = {
  id: string;
  kind: "player";
  playerId: string;
  name: string;
  position: string;
  nflTeam: string | null;
  rosterId: number;
  teamName: string;
  starter: boolean;
  value: number;
  confidence: ValueConfidence;
};

type PickAsset = {
  id: string;
  kind: "pick";
  name: string;
  position: "PICK";
  rosterId: number;
  teamName: string;
  value: number;
  confidence: ValueConfidence;
  pick: DraftPickAsset;
  tier: PickTier;
};

type Asset = PlayerAsset | PickAsset;

function requiredPositions(rosterPositions: string[]) {
  const counts: Record<string, number> = {};
  rosterPositions.filter((position) => !["BN", "IR", "IR+", "TAXI", "NA", "K", "DEF", "DST"].includes(position)).forEach((position) => {
    if (["FLEX", "WRT", "WRRB_FLEX", "REC_FLEX", "SUPER_FLEX", "SF", "OP", "Q/W/R/T"].includes(position)) return;
    counts[position] = (counts[position] || 0) + 1;
  });
  return counts;
}

function playerAssets(assets: Asset[]): PlayerAsset[] {
  return assets.filter((asset): asset is PlayerAsset => asset.kind === "player");
}

function positionCounts(team: LeagueTeam, profiles: Record<string, PlayerProfile>, outgoing: Asset[], incoming: Asset[]) {
  const outgoingIds = new Set(playerAssets(outgoing).map((asset) => asset.playerId));
  const counts: Record<string, number> = {};
  team.players.filter((playerId) => !outgoingIds.has(playerId)).forEach((playerId) => {
    const fallback = /^[A-Z]{2,3}$/.test(playerId) ? "DEF" : "—";
    const position = normalizePosition(profiles[playerId]?.position || fallback);
    counts[position] = (counts[position] || 0) + 1;
  });
  playerAssets(incoming).forEach((asset) => { counts[asset.position] = (counts[asset.position] || 0) + 1; });
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

function ordinal(round: number) {
  if (round % 100 >= 11 && round % 100 <= 13) return `${round}th`;
  return `${round}${round % 10 === 1 ? "st" : round % 10 === 2 ? "nd" : round % 10 === 3 ? "rd" : "th"}`;
}

function pickName(pick: DraftPickAsset) {
  return pick.draftSlot ? `${pick.season} ${pick.round}.${String(pick.draftSlot).padStart(2, "0")}` : `${pick.season} ${ordinal(pick.round)}`;
}

function formatLabel(format: TradeFormat) {
  return format === "dynasty" ? "Dynasty" : "Redraft";
}

function TradeSide({ title, subtitle, available, selected, onAdd, onRemove }: {
  title: string;
  subtitle: string;
  available: Asset[];
  selected: Asset[];
  onAdd: (assetId: string) => void;
  onRemove: (assetId: string) => void;
}) {
  const [assetFilter, setAssetFilter] = useState("ALL");
  const positions = [...new Set(available.filter((asset) => asset.kind === "player").map((asset) => asset.position).filter((position) => position !== "—"))].sort();
  const hasPicks = available.some((asset) => asset.kind === "pick");
  const positionsKey = positions.join("|");
  useEffect(() => {
    const filterIsValid = assetFilter === "ALL" || (assetFilter === "PICK" ? hasPicks : positions.includes(assetFilter));
    if (!filterIsValid) setAssetFilter("ALL");
  }, [assetFilter, hasPicks, positionsKey]);
  const filtered = available
    .filter((asset) => assetFilter === "ALL" || (assetFilter === "PICK" ? asset.kind === "pick" : asset.kind === "player" && asset.position === assetFilter))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const total = selected.reduce((sum, asset) => sum + asset.value, 0);

  return (
    <section className="trade-side">
      <div className="trade-side-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span className="trade-total">{total} pts</span></div>
      <div className="trade-side-controls">
        <select aria-label={`Filter ${title} assets`} value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)}>
          <option value="ALL">All assets</option>
          {hasPicks && <option value="PICK">Draft picks</option>}
          {positions.map((position) => <option key={position} value={position}>{position}</option>)}
        </select>
        <select aria-label={`Add an asset to ${title}`} value="" onChange={(event) => { if (event.target.value) onAdd(event.target.value); }}>
          <option value="" disabled>Add an asset</option>
          {filtered.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.kind === "pick" ? `${asset.tier} projection` : asset.position} · {asset.value}</option>)}
        </select>
      </div>
      <div className="trade-assets">
        {selected.map((asset) => (
          <article className={`trade-asset ${asset.kind === "pick" ? "pick-asset" : ""}`} key={asset.id}>
            <button className="asset-remove" onClick={() => onRemove(asset.id)} aria-label={`Remove ${asset.name}`}>×</button>
            <div className="trade-asset-copy">
              <b>{asset.name}</b>
              {asset.kind === "player"
                ? <small>{asset.position}{asset.nflTeam ? ` · ${asset.nflTeam}` : ""}{asset.starter ? " · Starter" : " · Bench"}</small>
                : <small>{asset.pick.draftSlot ? "Exact draft slot" : `Projected ${asset.tier}`} · originally {asset.pick.originalTeamName || "another roster"}</small>}
            </div>
            <div className="asset-value" title={`${asset.confidence} model confidence`}><strong>{asset.value}</strong><span>Locked value</span></div>
          </article>
        ))}
        {!selected.length && <div className="empty-slot"><strong>No assets added</strong><span>Select players{hasPicks ? " or draft picks" : ""} from the other roster.</span></div>}
      </div>
    </section>
  );
}

export default function TradeLabPage() {
  const { league, source, teamRosterId, hydrated } = useSelectedLeague();
  const defaultFormat: TradeFormat = league.leagueType === "dynasty" || league.leagueType === "keeper" ? "dynasty" : "redraft";
  const [format, setFormat] = useState<TradeFormat>(defaultFormat);
  const [teamAId, setTeamAId] = useState(teamRosterId);
  const [teamBId, setTeamBId] = useState(league.teams.find((team) => team.rosterId !== teamRosterId)?.rosterId ?? teamRosterId);
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [sideAIds, setSideAIds] = useState<string[]>([]);
  const [sideBIds, setSideBIds] = useState<string[]>([]);

  useEffect(() => {
    setTeamAId(teamRosterId);
    setTeamBId(league.teams.find((team) => team.rosterId !== teamRosterId)?.rosterId ?? teamRosterId);
    setFormat(league.leagueType === "dynasty" || league.leagueType === "keeper" ? "dynasty" : "redraft");
    setSideAIds([]);
    setSideBIds([]);
  }, [league.leagueId, league.leagueType, teamRosterId, league.teams]);

  useEffect(() => {
    const embedded = league.teams.reduce<Record<string, PlayerProfile>>((all, team) => ({ ...all, ...(team.playerProfiles || {}) }), {});
    setPlayerError("");
    if (source === "yahoo") { setProfiles(embedded); return; }
    if (source === "demo") {
      const featuredRanks = new Map(tradePlayers.slice().sort((a, b) => b.value - a.value).map((player, index) => [player.name, index + 1]));
      let fallbackRank = 75;
      setProfiles(Object.fromEntries(league.teams.flatMap((team) => team.players.map((name) => [name, {
        playerId: name, fullName: name, position: demoPlayerPositions[name] || "—", team: null, status: "Active", age: null,
        yearsExperience: null, searchRank: featuredRanks.get(name) ?? fallbackRank++
      }] as const))));
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
    })).then((chunks) => { if (!cancelled) setProfiles(Object.assign({}, ...chunks)); })
      .catch((error) => { if (!cancelled) setPlayerError(error instanceof Error ? error.message : "Unable to load player details."); })
      .finally(() => { if (!cancelled) setLoadingPlayers(false); });
    return () => { cancelled = true; };
  }, [league, source]);

  const teamA = league.teams.find((team) => team.rosterId === teamAId) || league.teams[0];
  const teamB = league.teams.find((team) => team.rosterId === teamBId) || league.teams[1] || league.teams[0];

  const assets = useMemo<Asset[]>(() => {
    const players: PlayerAsset[] = league.teams.flatMap((team) => team.players.map((playerId) => {
      const fallbackPosition = /^[A-Z]{2,3}$/.test(playerId) ? "DEF" : "—";
      const profile = profiles[playerId] || { playerId, fullName: playerId, position: fallbackPosition, team: null, status: null };
      const starter = team.starters.includes(playerId);
      const model = tradeValueForPlayer(profile, starter, format, { rosterPositions: league.rosterPositions, scoringSettings: league.scoringSettings });
      return {
        id: `player:${team.rosterId}:${playerId}`, kind: "player" as const, playerId, name: profile.fullName || playerId,
        position: model.position, nflTeam: profile.team || null, rosterId: team.rosterId, teamName: team.teamName,
        starter, value: model.value, confidence: model.confidence
      };
    }));
    if (format !== "dynasty") return players;
    const picks: PickAsset[] = (league.draftPicks || []).map((pick) => {
      const model = tradeValueForPick(pick, league.teams, league.season);
      const owner = league.teams.find((team) => team.rosterId === pick.ownerRosterId);
      return {
        id: `pick:${pick.id}`, kind: "pick" as const, name: pickName(pick), position: "PICK", rosterId: pick.ownerRosterId,
        teamName: owner?.teamName || `Roster ${pick.ownerRosterId}`, value: model.value, confidence: model.confidence, pick, tier: model.tier
      };
    });
    return [...players, ...picks];
  }, [format, league.draftPicks, league.rosterPositions, league.scoringSettings, league.season, league.teams, profiles]);

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const sideA = sideAIds.map((id) => assetMap.get(id)).filter((asset): asset is Asset => Boolean(asset));
  const sideB = sideBIds.map((id) => assetMap.get(id)).filter((asset): asset is Asset => Boolean(asset));
  const availableForA = assets.filter((asset) => asset.rosterId === teamB.rosterId && !sideAIds.includes(asset.id));
  const availableForB = assets.filter((asset) => asset.rosterId === teamA.rosterId && !sideBIds.includes(asset.id));

  const requirements = requiredPositions(league.rosterPositions);
  const beforeFitA = fitScore(teamA, profiles, requirements, [], []);
  const beforeFitB = fitScore(teamB, profiles, requirements, [], []);
  const fitDeltaA = fitScore(teamA, profiles, requirements, sideB, sideA) - beforeFitA;
  const fitDeltaB = fitScore(teamB, profiles, requirements, sideA, sideB) - beforeFitB;
  const rawA = sideA.reduce((sum, asset) => sum + asset.value, 0);
  const rawB = sideB.reduce((sum, asset) => sum + asset.value, 0);
  const playerValueA = playerAssets(sideA).reduce((sum, asset) => sum + asset.value, 0);
  const playerValueB = playerAssets(sideB).reduce((sum, asset) => sum + asset.value, 0);
  const pickValueA = rawA - playerValueA;
  const pickValueB = rawB - playerValueB;
  const adjustedA = rawA + fitDeltaA;
  const adjustedB = rawB + fitDeltaB;
  const difference = adjustedA - adjustedB;
  const tradeSize = Math.max((adjustedA + adjustedB) / 2, 1);
  const tolerance = Math.max(4, Math.round(tradeSize * 0.08));
  const isComplete = sideA.length > 0 && sideB.length > 0;
  const verdict = !sideA.length && !sideB.length ? "Build a trade" : !isComplete ? "Add the other side" : Math.abs(difference) <= tolerance ? "Fair value" : difference > 0 ? `${teamA.teamName} advantage` : `${teamB.teamName} advantage`;
  const advantage = isComplete ? Math.round((Math.abs(difference) / tradeSize) * 100) : 0;

  function resetTrade() { setSideAIds([]); setSideBIds([]); }
  function changeFormat(next: TradeFormat) { if (next !== format) { setFormat(next); resetTrade(); } }

  if (!hydrated) return <AppShell><div className="panel empty-state"><strong>Loading your league…</strong></div></AppShell>;

  return (
    <AppShell>
      <div className="page-heading trade-page-heading"><div><span className="eyebrow">Format-aware trade evaluation</span><h1>Trade Lab</h1><p>Locked values compare players, roster fit, and—when available—owned dynasty draft picks.</p></div><span className="pill">{source === "demo" ? "Sample rosters" : `${source} rosters`}</span></div>
      <section className="panel trade-toolbar">
        <div className="trade-format-copy"><span className="eyebrow">League format</span><h2>How should this trade be valued?</h2><p>{league.leagueType ? `Imported league type: ${league.leagueType}. Changing formats clears the trade.` : "Choose the format for this comparison."}</p></div>
        <div className="format-switch" role="radiogroup" aria-label="Trade format">
          <button className={format === "redraft" ? "active" : ""} role="radio" aria-checked={format === "redraft"} onClick={() => changeFormat("redraft")}><strong>Redraft</strong><span>Current-season players only</span></button>
          <button className={format === "dynasty" ? "active" : ""} role="radio" aria-checked={format === "dynasty"} onClick={() => changeFormat("dynasty")}><strong>Dynasty</strong><span>Players, age curves, and owned picks</span></button>
        </div>
      </section>
      <div className="team-pair-panel panel">
        <label><span>Team A</span><select value={teamA.rosterId} onChange={(event) => { setTeamAId(Number(event.target.value)); resetTrade(); }}>{league.teams.filter((team) => team.rosterId !== teamBId).map((team) => <option value={team.rosterId} key={team.rosterId}>{team.teamName} · {team.ownerName}</option>)}</select></label>
        <span className="trade-arrow">↔</span>
        <label><span>Team B</span><select value={teamB.rosterId} onChange={(event) => { setTeamBId(Number(event.target.value)); resetTrade(); }}>{league.teams.filter((team) => team.rosterId !== teamAId).map((team) => <option value={team.rosterId} key={team.rosterId}>{team.teamName} · {team.ownerName}</option>)}</select></label>
        {(sideA.length > 0 || sideB.length > 0) && <button className="text-button trade-reset" onClick={resetTrade}>Reset trade</button>}
      </div>
      {loadingPlayers && <div className="connection-message">Loading player profiles and locked values…</div>}
      {playerError && <div className="connection-message error">{playerError}</div>}
      {format === "dynasty" && !(league.draftPicks?.length) && <div className="connection-message dynasty-pick-note">No owned draft picks were supplied for this league. {source === "yahoo" ? "Yahoo pick support depends on the data available after API approval." : "Reconnect a Sleeper dynasty league to import future-pick ownership."}</div>}
      <div className="trade-grid trade-grid-clean">
        <TradeSide title={`${teamA.teamName} receives`} subtitle={`Assets currently owned by ${teamB.teamName}`} available={availableForA} selected={sideA} onAdd={(id) => setSideAIds((current) => [...current, id])} onRemove={(id) => setSideAIds((current) => current.filter((assetId) => assetId !== id))} />
        <div className={`trade-verdict ${isComplete && Math.abs(difference) > tolerance ? "has-advantage" : ""}`}>
          <span>{formatLabel(format)} verdict</span><strong>{verdict}</strong><div className="verdict-score"><b>{adjustedA}</b><i>vs.</i><b>{adjustedB}</b></div>
          {isComplete ? <p>{Math.abs(difference) <= tolerance ? `Within the ${tolerance}-point fair range.` : `${advantage}% modeled advantage after roster fit.`}</p> : <p>Add assets to both sides to complete the comparison.</p>}
          <div className="verdict-breakdown"><span>Players {playerValueA}–{playerValueB}</span>{format === "dynasty" && <span>Picks {pickValueA}–{pickValueB}</span>}<span>Roster fit {fitDeltaA >= 0 ? "+" : ""}{fitDeltaA} / {fitDeltaB >= 0 ? "+" : ""}{fitDeltaB}</span></div>
        </div>
        <TradeSide title={`${teamB.teamName} receives`} subtitle={`Assets currently owned by ${teamA.teamName}`} available={availableForB} selected={sideB} onAdd={(id) => setSideBIds((current) => [...current, id])} onRemove={(id) => setSideBIds((current) => current.filter((assetId) => assetId !== id))} />
      </div>
      <section className="panel trade-method-panel">
        <div><span className="eyebrow">Locked beta model</span><h2>What the score uses</h2></div>
        <div className="trade-method-grid">
          <article><strong>Players</strong><p>Position, starter role, health, provider ranking data, age, and league format.</p></article>
          <article><strong>Dynasty picks</strong><p>Current ownership, round, year, known draft slot, or an early/mid/late projection based on the original roster.</p></article>
          <article><strong>League fit</strong><p>Superflex, tight-end premium signals, and lineup requirements influence the result.</p></article>
        </div>
        <p className="model-disclaimer">Values cannot be edited. Future picks without a known slot are projections, not guarantees. FantasyNextMove evaluates the trade but never sends an offer to your league.</p>
      </section>
    </AppShell>
  );
}
