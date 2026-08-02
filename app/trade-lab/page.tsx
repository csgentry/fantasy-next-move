"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { usePlayerIntelligence } from "@/components/usePlayerIntelligence";
import { loadSavedLeaguesFromAccount, saveLeagueToAccount, type SavedLeagueRecord } from "@/lib/account-storage";
import { demoPlayerPositions, tradePlayers } from "@/lib/demo-data";
import { isSuperflex, normalizePosition, tradeValueForPick, tradeValueForPlayer } from "@/lib/trade-values";
import { marketKey, type MarketValueSignal } from "@/lib/market-values";
import type { AssetTier, PickTier, TradeFormat, ValueConfidence } from "@/lib/trade-values";
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
  lowValue: number;
  highValue: number;
  tier: AssetTier;
  confidence: ValueConfidence;
  projectedPoints: number | null;
  recentActualPoints: number | null;
  productionAdjustment: number;
  overallRank: number;
  positionRank: number;
  marketSource: string | null;
};

type PickAsset = {
  id: string;
  kind: "pick";
  name: string;
  position: "PICK";
  rosterId: number;
  teamName: string;
  value: number;
  lowValue: number;
  highValue: number;
  confidence: ValueConfidence;
  pick: DraftPickAsset;
  tier: PickTier;
};

type Asset = PlayerAsset | PickAsset;
type UnrankedPlayerAsset = PlayerAsset;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function leagueFormat(leagueType: string | undefined): TradeFormat {
  if (leagueType === "dynasty") return "dynasty";
  if (leagueType === "keeper") return "keeper";
  return "redraft";
}

function formatLabel(format: TradeFormat) {
  if (format === "dynasty") return "Dynasty";
  if (format === "keeper") return "Keeper";
  return "Redraft";
}

function leagueHasTep(settings: Record<string, number>) {
  return Object.entries(settings).some(([key, value]) => {
    const normalized = key.toLowerCase();
    return normalized.includes("te") && normalized.includes("rec") && Number(value) > 0;
  });
}

function scoringLabel(settings: Record<string, number>) {
  const reception = Number(settings.rec ?? settings.receptions ?? 0);
  if (reception >= 1) return "Full PPR";
  if (reception >= 0.5) return "Half PPR";
  return "Standard scoring";
}

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
    if (count < required) return score - (required - count) * 250;
    return score + Math.min(count - required, 2) * 45;
  }, 0);
}

function packageAdjustment(assets: Asset[]) {
  if (!assets.length) return 0;
  const total = assets.reduce((sum, asset) => sum + asset.value, 0);
  const best = Math.max(...assets.map((asset) => asset.value));
  const quantityPenalty = assets.length > 1 ? total * Math.min(0.16, (assets.length - 1) * 0.035) : 0;
  const elitePremium = best >= 8500 ? best * 0.05 : best >= 7000 ? best * 0.025 : 0;
  return Math.round(elitePremium - quantityPenalty);
}

function ordinal(round: number) {
  if (round % 100 >= 11 && round % 100 <= 13) return `${round}th`;
  return `${round}${round % 10 === 1 ? "st" : round % 10 === 2 ? "nd" : round % 10 === 3 ? "rd" : "th"}`;
}

function pickName(pick: DraftPickAsset) {
  return pick.draftSlot ? `${pick.season} ${pick.round}.${String(pick.draftSlot).padStart(2, "0")}` : `${pick.season} ${ordinal(pick.round)}`;
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
  const filtered = available
    .filter((asset) => assetFilter === "ALL" || (assetFilter === "PICK" ? asset.kind === "pick" : asset.kind === "player" && asset.position === assetFilter))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const total = selected.reduce((sum, asset) => sum + asset.value, 0);

  return (
    <section className="trade-side">
      <div className="trade-side-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span className="trade-total">{formatNumber(total)}</span></div>
      <div className="trade-side-controls">
        <select aria-label={`Filter ${title} assets`} value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)}>
          <option value="ALL">All assets</option>
          {hasPicks && <option value="PICK">Draft picks</option>}
          {positions.map((position) => <option key={position} value={position}>{position}</option>)}
        </select>
        <select aria-label={`Add an asset to ${title}`} value="" onChange={(event) => { if (event.target.value) onAdd(event.target.value); }}>
          <option value="" disabled>Add an asset</option>
          {filtered.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.kind === "pick" ? `${asset.tier} pick` : `${asset.position} #${asset.positionRank}`} · {formatNumber(asset.value)}</option>)}
        </select>
      </div>
      <div className="trade-assets">
        {selected.map((asset) => (
          <article className={`trade-asset ${asset.kind === "pick" ? "pick-asset" : ""}`} key={asset.id}>
            <button className="asset-remove" onClick={() => onRemove(asset.id)} aria-label={`Remove ${asset.name}`}>×</button>
            <div className="trade-asset-copy">
              <b>{asset.name}</b>
              {asset.kind === "player" ? (
                <>
                  <small>{asset.position} · Overall #{asset.overallRank} · {asset.position}#{asset.positionRank} · {asset.tier}</small>
                  <small>{asset.nflTeam || "FA"}{asset.starter ? " · Imported starter" : " · Imported bench"}{asset.projectedPoints !== null ? ` · ${asset.projectedPoints.toFixed(2)} projected` : ""}</small>
                </>
              ) : <small>{asset.pick.draftSlot ? "Exact draft slot" : `Projected ${asset.tier}`} · originally {asset.pick.originalTeamName || "another roster"}</small>}
            </div>
            <div className="asset-value" title={`${asset.confidence} model confidence`}><strong>{formatNumber(asset.value)}</strong><span>{formatNumber(asset.lowValue)}–{formatNumber(asset.highValue)}</span></div>
          </article>
        ))}
        {!selected.length && <div className="empty-slot"><strong>No assets added</strong><span>Select players{hasPicks ? " or draft picks" : ""} from the other roster.</span></div>}
      </div>
    </section>
  );
}

export default function TradeLabPage() {
  const { league, source, teamRosterId, setLeague, hydrated } = useSelectedLeague();
  const intelligenceState = usePlayerIntelligence(league, source);
  const importedFormat = leagueFormat(league.leagueType);
  const [manualFormat, setManualFormat] = useState<TradeFormat>(importedFormat);
  const format = source === "demo" ? manualFormat : importedFormat;
  const [savedLeagues, setSavedLeagues] = useState<SavedLeagueRecord[]>([]);
  const [changingLeague, setChangingLeague] = useState(false);
  const [teamAId, setTeamAId] = useState(teamRosterId);
  const [teamBId, setTeamBId] = useState(league.teams.find((team) => team.rosterId !== teamRosterId)?.rosterId ?? teamRosterId);
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [marketValues, setMarketValues] = useState<Record<string, MarketValueSignal>>({});
  const [marketStatus, setMarketStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [sideAIds, setSideAIds] = useState<string[]>([]);
  const [sideBIds, setSideBIds] = useState<string[]>([]);

  useEffect(() => {
    if (source !== "demo") loadSavedLeaguesFromAccount().then(setSavedLeagues).catch(() => undefined);
  }, [source, league.leagueId]);

  useEffect(() => {
    setTeamAId(teamRosterId);
    setTeamBId(league.teams.find((team) => team.rosterId !== teamRosterId)?.rosterId ?? teamRosterId);
    setManualFormat(importedFormat);
    setSideAIds([]);
    setSideBIds([]);
  }, [league.leagueId, importedFormat, teamRosterId, league.teams]);


  useEffect(() => {
    if (source === "demo") {
      setMarketValues({});
      setMarketStatus("idle");
      return;
    }
    let canceled = false;
    setMarketStatus("loading");
    const params = new URLSearchParams({
      format: importedFormat,
      numQbs: isSuperflex(league.rosterPositions) ? "2" : "1",
      tep: String(leagueHasTep(league.scoringSettings))
    });
    fetch(`/api/market/tradyr?${params.toString()}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Market feed unavailable.");
        return payload as { values?: MarketValueSignal[] };
      })
      .then((payload) => {
        if (canceled) return;
        setMarketValues(Object.fromEntries((payload.values || []).map((value) => [marketKey(value.name, value.position), value])));
        setMarketStatus("ready");
      })
      .catch(() => {
        if (!canceled) {
          setMarketValues({});
          setMarketStatus("fallback");
        }
      });
    return () => { canceled = true; };
  }, [importedFormat, league.rosterPositions, league.scoringSettings, source]);

  useEffect(() => {
    const embedded = league.teams.reduce<Record<string, PlayerProfile>>((all, team) => ({ ...all, ...(team.playerProfiles || {}) }), {});
    setPlayerError("");
    if (source === "yahoo") { setProfiles(embedded); setLoadingPlayers(false); return; }
    if (source === "demo") {
      const featuredRanks = new Map(tradePlayers.slice().sort((a, b) => b.value - a.value).map((player, index) => [player.name, index + 1]));
      let fallbackRank = 75;
      setProfiles(Object.fromEntries(league.teams.flatMap((team) => team.players.map((name) => [name, {
        playerId: name, fullName: name, position: demoPlayerPositions[name] || "—", team: null, status: "Active", age: 24 + (fallbackRank % 8),
        yearsExperience: fallbackRank % 5, searchRank: featuredRanks.get(name) ?? fallbackRank++
      }] as const))));
      setLoadingPlayers(false);
      return;
    }
    setLoadingPlayers(intelligenceState.loading);
    if (intelligenceState.data) setProfiles({ ...embedded, ...intelligenceState.data.profiles });
    if (intelligenceState.error) setPlayerError(intelligenceState.error);
  }, [intelligenceState.data, intelligenceState.error, intelligenceState.loading, league, source]);

  const teamA = league.teams.find((team) => team.rosterId === teamAId) || league.teams[0];
  const teamB = league.teams.find((team) => team.rosterId === teamBId) || league.teams[1] || league.teams[0];
  const snapshotMap = useMemo(() => new Map((intelligenceState.data?.currentSnapshots || []).map((snapshot) => [snapshot.playerId, snapshot])), [intelligenceState.data?.currentSnapshots]);

  const assets = useMemo<Asset[]>(() => {
    const unranked: UnrankedPlayerAsset[] = league.teams.flatMap((team) => team.players.map((playerId) => {
      const fallbackPosition = /^[A-Z]{2,3}$/.test(playerId) ? "DEF" : "—";
      const profile = profiles[playerId] || { playerId, fullName: playerId, position: fallbackPosition, team: null, status: null };
      const starter = team.starters.includes(playerId);
      const market = marketValues[marketKey(profile.fullName || playerId, profile.position)];
      const model = tradeValueForPlayer(profile, starter, format, {
        rosterPositions: league.rosterPositions,
        scoringSettings: league.scoringSettings,
        totalRosters: league.totalRosters
      }, snapshotMap.get(playerId), market);
      return {
        id: `player:${team.rosterId}:${playerId}`, kind: "player" as const, playerId, name: profile.fullName || playerId,
        position: model.position, nflTeam: profile.team || null, rosterId: team.rosterId, teamName: team.teamName,
        starter, value: model.value, lowValue: model.lowValue, highValue: model.highValue, tier: model.tier,
        confidence: model.confidence, projectedPoints: model.projectedPoints, recentActualPoints: model.recentActualPoints,
        productionAdjustment: model.productionAdjustment,
        overallRank: model.marketRank || 0,
        positionRank: model.marketPositionRank || 0,
        marketSource: model.marketSource
      };
    }));
    const sorted = [...unranked].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    const overallRanks = new Map(sorted.map((asset, index) => [asset.id, index + 1]));
    const positionRanks = new Map<string, number>();
    const rankedPlayers: PlayerAsset[] = sorted.map((asset) => {
      const key = asset.position;
      const next = (positionRanks.get(key) || 0) + 1;
      positionRanks.set(key, next);
      return {
        ...asset,
        overallRank: asset.overallRank || overallRanks.get(asset.id) || 0,
        positionRank: asset.positionRank || next
      };
    });
    if (format === "redraft") return rankedPlayers;
    const picks: PickAsset[] = (league.draftPicks || []).map((pick) => {
      const model = tradeValueForPick(pick, league.teams, league.season);
      const owner = league.teams.find((team) => team.rosterId === pick.ownerRosterId);
      return {
        id: `pick:${pick.id}`, kind: "pick" as const, name: pickName(pick), position: "PICK", rosterId: pick.ownerRosterId,
        teamName: owner?.teamName || `Roster ${pick.ownerRosterId}`, value: model.value, lowValue: model.lowValue,
        highValue: model.highValue, confidence: model.confidence, pick, tier: model.tier
      };
    });
    return [...rankedPlayers, ...picks];
  }, [format, league, marketValues, profiles, snapshotMap]);

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const sideA = sideAIds.map((id) => assetMap.get(id)).filter((asset): asset is Asset => Boolean(asset));
  const sideB = sideBIds.map((id) => assetMap.get(id)).filter((asset): asset is Asset => Boolean(asset));
  const availableForA = assets.filter((asset) => asset.rosterId === teamB.rosterId && !sideAIds.includes(asset.id));
  const availableForB = assets.filter((asset) => asset.rosterId === teamA.rosterId && !sideBIds.includes(asset.id));

  const requirements = requiredPositions(league.rosterPositions);
  const fitDeltaA = fitScore(teamA, profiles, requirements, sideB, sideA) - fitScore(teamA, profiles, requirements, [], []);
  const fitDeltaB = fitScore(teamB, profiles, requirements, sideA, sideB) - fitScore(teamB, profiles, requirements, [], []);
  const rawA = sideA.reduce((sum, asset) => sum + asset.value, 0);
  const rawB = sideB.reduce((sum, asset) => sum + asset.value, 0);
  const playerValueA = playerAssets(sideA).reduce((sum, asset) => sum + asset.value, 0);
  const playerValueB = playerAssets(sideB).reduce((sum, asset) => sum + asset.value, 0);
  const pickValueA = rawA - playerValueA;
  const pickValueB = rawB - playerValueB;
  const projectedA = playerAssets(sideA).reduce((sum, asset) => sum + (asset.projectedPoints || 0), 0);
  const projectedB = playerAssets(sideB).reduce((sum, asset) => sum + (asset.projectedPoints || 0), 0);
  const packageA = packageAdjustment(sideA);
  const packageB = packageAdjustment(sideB);
  const adjustedA = rawA + fitDeltaA + packageA;
  const adjustedB = rawB + fitDeltaB + packageB;
  const difference = adjustedA - adjustedB;
  const tradeSize = Math.max((adjustedA + adjustedB) / 2, 1);
  const tolerance = Math.max(250, Math.round(tradeSize * 0.07));
  const isComplete = sideA.length > 0 && sideB.length > 0;
  const verdict = !sideA.length && !sideB.length ? "Build a trade" : !isComplete ? "Add the other side" : Math.abs(difference) <= tolerance ? "Fair trade" : difference > 0 ? `Slight edge: ${teamA.teamName}` : `Slight edge: ${teamB.teamName}`;
  const advantage = isComplete ? (Math.abs(difference) / tradeSize) * 100 : 0;

  function resetTrade() { setSideAIds([]); setSideBIds([]); }

  async function changeLeague(recordId: string) {
    const record = savedLeagues.find((item) => item.id === recordId);
    if (!record) return;
    setChangingLeague(true);
    try {
      const selectedRosterId = record.selected_roster_id ?? record.raw_data.userRosterId ?? record.raw_data.teams[0]?.rosterId ?? null;
      await saveLeagueToAccount(record.raw_data, selectedRosterId);
      setLeague(record.raw_data);
      resetTrade();
    } finally {
      setChangingLeague(false);
    }
  }

  if (!hydrated) return <AppShell><div className="panel empty-state"><strong>Loading your league…</strong></div></AppShell>;

  return (
    <AppShell>
      <div className="page-heading trade-page-heading"><div><span className="eyebrow">League-aware market evaluation</span><h1>Trade Lab 2.0</h1><p>Every value is locked to the selected league&apos;s format, scoring, lineup requirements, roster depth, projections, and owned draft picks.</p></div><span className="pill">0–10,000 value scale</span></div>

      <section className="panel trade-league-context">
        <div><span className="eyebrow">Trade Lab for</span><h2>{league.name}</h2><p>{formatLabel(format)} · {league.totalRosters} teams · {scoringLabel(league.scoringSettings)} · {league.rosterPositions.join(" · ")}</p></div>
        {savedLeagues.length > 1 && <label><span>Change league</span><select disabled={changingLeague} value={savedLeagues.find((item) => item.raw_data.leagueId === league.leagueId)?.id || ""} onChange={(event) => changeLeague(event.target.value)}>{savedLeagues.map((record) => <option key={record.id} value={record.id}>{record.name} · {formatLabel(leagueFormat(record.raw_data.leagueType))}</option>)}</select></label>}
      </section>

      {source === "demo" ? (
        <section className="panel trade-toolbar">
          <div className="trade-format-copy"><span className="eyebrow">No connected league</span><h2>Choose a sample calculator</h2><p>Connected leagues lock this automatically. Manual mode is available only for the fictional demo.</p></div>
          <div className="format-switch three" role="radiogroup" aria-label="Trade format">
            {(["redraft", "keeper", "dynasty"] as TradeFormat[]).map((option) => <button key={option} className={manualFormat === option ? "active" : ""} onClick={() => { setManualFormat(option); resetTrade(); }}><strong>{formatLabel(option)}</strong><span>{option === "redraft" ? "Current season" : option === "keeper" ? "Limited retention" : "Long-term and picks"}</span></button>)}
          </div>
        </section>
      ) : <div className="connection-message success"><strong>{formatLabel(format)} is locked from the imported league.</strong> Trade Lab will not let this league be evaluated under a conflicting format.</div>}

      <div className="team-pair-panel panel">
        <label><span>Team A</span><select value={teamA.rosterId} onChange={(event) => { setTeamAId(Number(event.target.value)); resetTrade(); }}>{league.teams.filter((team) => team.rosterId !== teamBId).map((team) => <option value={team.rosterId} key={team.rosterId}>{team.teamName} · {team.ownerName}</option>)}</select></label>
        <span className="trade-arrow">↔</span>
        <label><span>Team B</span><select value={teamB.rosterId} onChange={(event) => { setTeamBId(Number(event.target.value)); resetTrade(); }}>{league.teams.filter((team) => team.rosterId !== teamAId).map((team) => <option value={team.rosterId} key={team.rosterId}>{team.teamName} · {team.ownerName}</option>)}</select></label>
        {(sideA.length > 0 || sideB.length > 0) && <button className="text-button trade-reset" onClick={resetTrade}>Reset trade</button>}
      </div>

      {loadingPlayers && <div className="connection-message">Loading league-specific projections and market values…</div>}
      {playerError && <div className="connection-message error">{playerError}</div>}
      {format !== "redraft" && !(league.draftPicks?.length) && <div className="connection-message dynasty-pick-note">No owned draft picks were supplied for this league. Player values remain active, but draft-pick analysis is incomplete.</div>}

      <div className="trade-grid trade-grid-clean">
        <TradeSide title={`${teamA.teamName} receives`} subtitle={`Assets currently owned by ${teamB.teamName}`} available={availableForA} selected={sideA} onAdd={(id) => setSideAIds((current) => [...current, id])} onRemove={(id) => setSideAIds((current) => current.filter((assetId) => assetId !== id))} />
        <div className={`trade-verdict ${isComplete && Math.abs(difference) > tolerance ? "has-advantage" : ""}`}>
          <span>{formatLabel(format)} verdict</span><strong>{verdict}</strong><div className="verdict-score"><b>{formatNumber(adjustedA)}</b><i>vs.</i><b>{formatNumber(adjustedB)}</b></div>
          {isComplete ? <p>{Math.abs(difference) <= tolerance ? `Inside the ±${formatNumber(tolerance)} fair-market range.` : `${advantage.toFixed(1)}% modeled difference after roster fit and package value.`}</p> : <p>Add assets to both sides to complete the comparison.</p>}
          <div className="verdict-breakdown"><span>Players {formatNumber(playerValueA)}–{formatNumber(playerValueB)}</span><span>Weekly projection {projectedA.toFixed(2)}–{projectedB.toFixed(2)}</span>{format !== "redraft" && <span>Picks {formatNumber(pickValueA)}–{formatNumber(pickValueB)}</span>}<span>Roster fit {fitDeltaA >= 0 ? "+" : ""}{formatNumber(fitDeltaA)} / {fitDeltaB >= 0 ? "+" : ""}{formatNumber(fitDeltaB)}</span><span>Package adjustment {packageA >= 0 ? "+" : ""}{formatNumber(packageA)} / {packageB >= 0 ? "+" : ""}{formatNumber(packageB)}</span></div>
        </div>
        <TradeSide title={`${teamB.teamName} receives`} subtitle={`Assets currently owned by ${teamA.teamName}`} available={availableForB} selected={sideB} onAdd={(id) => setSideBIds((current) => [...current, id])} onRemove={(id) => setSideBIds((current) => current.filter((assetId) => assetId !== id))} />
      </div>

      <section className="panel trade-method-panel">
        <div><span className="eyebrow">FantasyNextMove consensus model</span><h2>Market value plus actual league impact</h2></div>
        <div className="trade-method-grid">
          <article><strong>Market separation</strong><p>The 0–10,000 scale keeps elite assets, premium rookies, starters, depth players, and picks from collapsing into the same two-digit range.</p></article>
          <article><strong>League context</strong><p>Format, Superflex, tight-end premium, team count, starting requirements, roster depth, scoring, and current projections change the result.</p></article>
          <article><strong>Trade structure</strong><p>Elite-asset premiums, quantity discounts, replacement level, roster fit, and package consolidation are evaluated instead of simply adding raw values.</p></article>
        </div>
        <p className="model-disclaimer">FantasyNextMove does not scrape or reproduce proprietary competitor rankings. It combines imported league information, player profile signals, projections, performance, age curves, scarcity, and FantasyNextMove&apos;s valuation rules with a permitted market composite when available. {marketStatus === "loading" ? "Refreshing market consensus…" : marketStatus === "fallback" ? "The live market feed is temporarily unavailable, so independent fallback values are shown." : marketStatus === "ready" ? <>Market consensus powered in part by <a href="https://tradyr.app" target="_blank" rel="noreferrer">Tradyr</a>.</> : "The fictional demo does not expose live market values."}</p>
      </section>
    </AppShell>
  );
}
