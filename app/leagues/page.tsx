"use client";

import {LeagueContext} from "@/components/LeagueContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { loadSavedLeaguesFromAccount, saveLeagueToAccount } from "@/lib/account-storage";
import {useSelectedLeague} from "@/components/LeaguePicker";
import {usePlayerIntelligence} from "@/components/usePlayerIntelligence";
import {PowerRankingsEngine} from "@/components/PowerRankingsEngine";
import type { SavedLeagueRecord } from "@/lib/account-storage";

function formatLabel(value: string | undefined) {
  if (value === "dynasty") return "Dynasty";
  if (value === "keeper") return "Keeper";
  return "Redraft";
}

export default function MyLeaguesPage() {
  const router = useRouter();
  const selected=useSelectedLeague();
  const {source,teamRosterId}=selected;
  const intelligence=usePlayerIntelligence(selected.league,source,teamRosterId);
  const league=intelligence.data?.currentLeague||selected.league;
  const [leagues, setLeagues] = useState<SavedLeagueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSavedLeaguesFromAccount()
      .then(setLeagues)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load saved leagues."))
      .finally(() => setLoading(false));
  }, []);

  async function openLeague(record: SavedLeagueRecord) {
    setOpening(record.id);
    setError("");
    try {
      const selectedRosterId = record.selected_roster_id ?? record.raw_data.userRosterId ?? record.raw_data.teams[0]?.rosterId ?? null;
      await saveLeagueToAccount(record.raw_data, selectedRosterId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open this league.");
      setOpening("");
    }
  }

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Your league context</span><h1>League</h1><p>See how your team compares. Switch connected leagues below.</p></div><a className="button small" href="/connect">Connect another league</a></div>
      {source === "yahoo" && <section className="panel"><h2>League comparisons need independent data</h2><p>Your Yahoo roster is available in My Team. Opponent rosters are not retrieved or saved.</p></section>}{error && <div className="connection-message error">{error}</div>}
      {loading && <div className="panel empty-state"><strong>Loading saved leagues…</strong></div>}
      {!loading && !leagues.length && <div className="panel empty-state"><strong>No saved leagues yet.</strong><p>Connect Sleeper to add your first league. Yahoo is pending activation.</p><a className="button small" href="/connect">Connect a league</a></div>}
      {source === "sleeper" && <><LeagueContext selected={selected} data={intelligence.data}/><section className="panel"><div className="section-title"><h2>Standings</h2><span className="context-label">Record · Points for</span></div><div className="standings-list">{[...league.teams].sort((a,b)=>(b.wins-a.wins)||(a.losses-b.losses)||(b.pointsFor-a.pointsFor)).map((team,index)=><div className={`standings-row ${team.rosterId===teamRosterId?'mine':''}`} key={team.rosterId}><span>{index+1}</span><strong>{team.teamName}{team.rosterId===teamRosterId?' · You':''}</strong><small>{team.wins}–{team.losses}{team.ties?`–${team.ties}`:''} · {team.pointsFor.toFixed(1)}</small></div>)}</div><p className="source-note">Ordered by wins, losses, then points for. League-specific tie-break rules may differ.</p></section><details className="panel league-details"><summary>Week {intelligence.data?.projectionWeek||'—'} matchups</summary>{intelligence.data?.currentMatchups?.filter(m=>m.week===intelligence.data?.projectionWeek&&m.matchupId).map((m,_i,all)=>{const opponent=all.find(o=>o.matchupId===m.matchupId&&o.rosterId!==m.rosterId);if(opponent&&opponent.rosterId<m.rosterId)return null;return <div className="matchup-row" key={m.rosterId}><span>{league.teams.find(t=>t.rosterId===m.rosterId)?.teamName} · {m.points.toFixed(1)}</span><span>{opponent?`${league.teams.find(t=>t.rosterId===opponent.rosterId)?.teamName} · ${opponent.points.toFixed(1)}`:'No opponent supplied'}</span></div>})}<p className="source-note">Provider matchup points; not a live NFL score feed.</p></details><details className="panel league-details"><summary>League settings</summary><dl className="league-settings"><div><dt>Starting and roster slots</dt><dd>{league.rosterPositions.join(' · ')}</dd></div><div><dt>Reception scoring</dt><dd>{league.scoringSettings.rec??0} points per reception</dd></div></dl></details><details className="panel league-details"><summary>Power Rankings and positional comparisons</summary><PowerRankingsEngine league={league} source={source} myRosterId={teamRosterId} intelligence={intelligence.data}/></details></>}
      {!!leagues.length && <details className="panel league-details"><summary>Connected leagues</summary><section className="saved-league-grid">{leagues.map((record) => (
        <article className={`panel saved-league-card ${record.is_active ? "active" : ""}`} key={record.id}>
          <div><span className="eyebrow">{record.provider} · {record.season}</span><h2>{record.name}</h2><p>{formatLabel(record.raw_data.leagueType)} · {record.raw_data.totalRosters} teams{record.raw_data.draftPicks?.length ? ` · ${record.raw_data.draftPicks.length} picks tracked` : ""}</p></div>
          <div className="saved-league-actions">{record.is_active && <span className="pill">Active</span>}<button className="button small" disabled={Boolean(opening)} onClick={() => openLeague(record)}>{opening === record.id ? "Opening…" : "Open league"}</button></div>
        </article>
      ))}</section></details>}
    </AppShell>
  );
}
