"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeMatchups } from "@/components/HomeMatchups";
import { EventTracker } from "@/components/EventTracker";
import { DashboardPerformance } from '@/components/DashboardPerformance';
import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { usePlayerIntelligence } from "@/components/usePlayerIntelligence";
import {useAnalysisSession} from '@/components/PlayerAnalysisSession';
import { ToolIcon } from "@/components/ToolIcon";
import { PlayerDetails } from "@/components/PlayerDetails";
import { customerSleeperAvatar } from "@/lib/home-imagery";
import { homepageRecommendations, rosterAvailability } from "@/lib/home-dashboard";
import { hasCurrentAnalysis } from "@/lib/decision-tools";
import type { PlayerRecommendation } from "@/lib/types";
import styles from "./dashboard.module.css";

const tools = [
  { name: "My Team", description: "Manage roster", href: "/team", icon: "team" },
  { name: "Trade Lab", description: "Analyze trades", href: "/trade-lab", icon: "trade" },
  { name: "Start/Sit", description: "Set lineup advice", href: "/team?view=lineup", icon: "lineup" },
  { name: "Waivers", description: "Find top adds", href: "/waivers", icon: "waiver" }
] as const;

function destination(move: PlayerRecommendation) {
  return move.category === "Trade" ? { href: "/trade-lab", label: "Analyze this trade" }
    : move.category === "Waiver" ? { href: "/waivers", label: "Review waiver options" }
    : { href: "/team?view=lineup", label: "Review Start/Sit" };
}

export default function DashboardPage() {
  const selected = useSelectedLeague();
  const {owner,accountReady}=useAnalysisSession();
  const [matchupWeek, setMatchupWeek] = useState<number | null>(null);
  const state = usePlayerIntelligence(selected.league, selected.source, selected.teamRosterId,'dashboard');
  const data = state.data;
  const league = data?.currentLeague || selected.league;
  const team = league.teams.find(t => t.rosterId === selected.teamRosterId);
  const connected = selected.hydrated && selected.source !== "demo" && Boolean(team);
  const current = hasCurrentAnalysis(data);
  const moves = connected && current ? homepageRecommendations(data?.nextMoves || []) : [];
  const {loading: analysisLoading, refresh: refreshAnalysis} = state;
  // Refresh on return after the session cache expires; never poll hidden pages.
  useEffect(() => {
    if (!connected || selected.source !== 'sleeper') return;
    let checked=Date.now();
    const refresh=()=>{if(document.visibilityState==='visible'&&!analysisLoading&&Date.now()-checked>=300000){checked=Date.now();refreshAnalysis();}};
    const timer=setInterval(refresh,300000);
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('focus',refresh);
    return () => {clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};
  }, [connected, selected.source, analysisLoading, refreshAnalysis]);
  const primary = moves[0];
  const action = primary ? destination(primary) : null;
  const week = matchupWeek || data?.projectionWeek || league.providerContext?.currentWeek;
  const matchup = current && team ? data?.currentMatchups?.find(m => m.rosterId === team.rosterId && m.week === week) : null;
  const opponent = matchup?.matchupId != null ? data?.currentMatchups?.find(m => m.week === week && m.matchupId === matchup.matchupId && m.rosterId !== team?.rosterId) : null;
  const opponentName = opponent ? league.teams.find(t => t.rosterId === opponent.rosterId)?.teamName : null;
  const concerns = current ? rosterAvailability(team,data?.profiles || {}) : [];
  const syncDate = data?.syncedAt ? new Date(data.syncedAt) : null;
  const syncValid = syncDate && Number.isFinite(syncDate.getTime());
  const title = !selected.hydrated ? "Loading your team…" : !connected ? "Your next move starts here." : state.loading ? "Finding your next move…" : primary?.title || "Your roster. A clearer next step.";
  const explanation = !connected ? selected.error || "Connect your league for advice built around your team, roster and scoring."
    : state.loading ? "Checking your roster and the latest available league data."
    : primary ? primary.reason.split(/(?<=[.!?])\s/)[0]
    : selected.source === "yahoo" ? "Your roster is connected. Verified weekly projections are not available, so we’re holding back projected recommendations."
    : current ? "No clear move is supported by the current data. Review your roster and upcoming lineup."
    : "Review your roster while current data is unavailable. We’ll recommend a move when reliable analysis is ready.";

  return <AppShell nextMove profileAvatarUrl={customerSleeperAvatar(league)}>
    <DashboardPerformance leagueReady={connected} analysisReady={Boolean(data)}/>
    <EventTracker event="dashboard_viewed" />
    {primary && <EventTracker event="first_recommendation_shown" />}
    <div className={styles.dashboard}>
      <header className={styles.heading}>
        <div><span className={styles.kicker}>YOUR TEAM. YOUR NEXT MOVE.</span><h1>Next Move</h1></div>
        {connected && team && <p>{team.teamName}{opponentName && <span>vs {opponentName}</span>}</p>}
      </header>
      <div className={styles.decisionGrid}>
        <section className={styles.hero} aria-labelledby="next-move-title" aria-busy={!selected.hydrated || (connected && state.loading)}>
          <div className={styles.heroTop}><span>YOUR NEXT MOVE</span>{connected && <span className={styles.week}>{week ? `Week ${week}` : league.season}</span>}</div>
          {connected && <span className={styles.heroLeague}>{league.name}</span>}
          <h2 id="next-move-title">{title}</h2>
          <p>{explanation}</p>
          {primary?.projectedGain != null && primary.projectedGain > 0 && primary.category === "Lineup" && <p className={styles.benefit}>About +{primary.projectedGain.toFixed(1)} projected lineup points</p>}
          {!selected.hydrated || (connected && state.loading) ? <div className={styles.loading} role="status"><span />Checking your team</div>
            : <Link className={`button ${styles.primaryAction}`} href={!connected ? "/connect" : action?.href || "/team"}>{!connected ? "Connect your league" : primary ? "View Recommendations" : "Review my team"}<span aria-hidden="true">→</span></Link>}

        </section>
        <nav className={styles.tools} aria-label="Fantasy tools">{tools.map(tool => <Link key={tool.name} href={tool.href}><ToolIcon name={tool.icon} /><span><strong>{tool.name}</strong><small>{tool.description}</small></span></Link>)}</nav>
      </div>
      <HomeMatchups key={owner||'signed-out'} enabled={accountReady} selectedLeague={league} analysis={data} onSelect={selected.setLeague} onWeek={setMatchupWeek}/>
      {state.error && connected && <p className={styles.error} role="alert">{state.error} <button className={styles.retry} disabled={state.loading} onClick={refreshAnalysis}>Retry analysis</button></p>}
      {concerns.length > 0 && <section className={styles.concerns} aria-labelledby="before-kickoff-title">
        <div className={styles.concernsHeading}><h2 id="before-kickoff-title">Before Kickoff</h2><Link href="/team?view=lineup">Review lineup →</Link></div>
        {concerns.map(player=><div className={styles.availabilityRow} key={player.playerId}>
          <div className={styles.availabilityPlayer}><PlayerDetails profile={player} snapshot={data?.currentSnapshots.find(p=>p.playerId===player.playerId)} source={selected.source}>{player.fullName}</PlayerDetails><small>{[player.position,player.team].filter(Boolean).join(' · ')}</small></div>
          <span className={styles.availabilityBadge} data-status={player.injuryStatus}>{player.injuryStatus}</span>
        </div>)}
        <small className={styles.concernsSource}>Sleeper availability{syncValid&&<> · Checked <time dateTime={syncDate.toISOString()}>{syncDate.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time></>}.{concerns.some(player=>player.injuryStatus?.toLowerCase()==='questionable')&&' Questionable does not mean ruled out.'}</small>
      </section>}
    </div>
  </AppShell>;
}
