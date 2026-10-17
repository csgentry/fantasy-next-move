"use client";

import Link from "next/link";
import { EventTracker } from "@/components/EventTracker";
import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { usePlayerIntelligence } from "@/components/usePlayerIntelligence";
import { TeamAvatar } from "@/components/TeamAvatar";
import { ToolIcon } from "@/components/ToolIcon";
import { PlayerDetails } from "@/components/PlayerDetails";
import { hasCurrentAnalysis } from "@/lib/decision-tools";
import type { PlayerRecommendation } from "@/lib/types";
import styles from "./dashboard.module.css";

const tools = [
  { name: "My Team", description: "Manage your roster", href: "/team", icon: "team" },
  { name: "Trade Lab", description: "Analyze a trade", href: "/trade-lab", icon: "trade" },
  { name: "Start/Sit", description: "Review your lineup", href: "/team?view=lineup", icon: "lineup" },
  { name: "Waivers", description: "Find available adds", href: "/waivers", icon: "waiver" }
] as const;

function destination(move: PlayerRecommendation) {
  return move.category === "Trade" ? { href: "/trade-lab", label: "Analyze this trade" }
    : move.category === "Waiver" ? { href: "/waivers", label: "Review waiver options" }
    : { href: "/team?view=lineup", label: "Review Start/Sit" };
}

export default function DashboardPage() {
  const selected = useSelectedLeague();
  const state = usePlayerIntelligence(selected.league, selected.source, selected.teamRosterId);
  const data = state.data;
  const league = data?.currentLeague || selected.league;
  const team = league.teams.find(t => t.rosterId === selected.teamRosterId);
  const connected = selected.hydrated && selected.source !== "demo" && Boolean(team);
  const current = hasCurrentAnalysis(data);
  const moves = connected && current ? data?.nextMoves || [] : [];
  const primary = moves[0];
  const action = primary ? destination(primary) : null;
  const week = data?.projectionWeek || league.providerContext?.currentWeek;
  const matchup = current && team ? data?.currentMatchups?.find(m => m.rosterId === team.rosterId && m.week === week) : null;
  const opponent = matchup?.matchupId != null ? data?.currentMatchups?.find(m => m.week === week && m.matchupId === matchup.matchupId && m.rosterId !== team?.rosterId) : null;
  const opponentName = opponent ? league.teams.find(t => t.rosterId === opponent.rosterId)?.teamName : null;
  const concerns = current && team ? team.players.map(id => data?.profiles[id]).filter(p => p?.injuryStatus).slice(0, 3) : [];
  const syncedAt = data?.syncedAt || (selected.source === "yahoo" ? league.providerContext?.syncedAt : null);
  const syncDate = syncedAt ? new Date(syncedAt) : null;
  const syncValid = syncDate && Number.isFinite(syncDate.getTime());
  const title = !selected.hydrated ? "Loading your team…" : !connected ? "Your next move starts here." : state.loading ? "Finding your next move…" : primary?.title || "Your roster. A clearer next step.";
  const explanation = !connected ? selected.error || "Connect your league for advice built around your team, roster and scoring."
    : state.loading ? "Checking your roster and the latest available league data."
    : primary ? primary.reason.split(/(?<=[.!?])\s/)[0]
    : selected.source === "yahoo" ? "Your roster is connected. Verified weekly projections are not available, so we’re holding back projected recommendations."
    : "Review your roster while current data is unavailable. We’ll recommend a move when reliable analysis is ready.";

  return <AppShell nextMove>
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
          <h2 id="next-move-title">{title}</h2>
          <p>{explanation}</p>
          {primary?.projectedGain != null && primary.projectedGain > 0 && primary.category === "Lineup" && <p className={styles.benefit}>About +{primary.projectedGain.toFixed(1)} projected lineup points</p>}
          {!selected.hydrated || (connected && state.loading) ? <div className={styles.loading} role="status"><span />Checking your team</div>
            : <Link className={`button ${styles.primaryAction}`} href={!connected ? "/connect" : action?.href || "/team"}>{!connected ? "Connect your league" : action?.label || "Review my team"}<span aria-hidden="true">→</span></Link>}

        </section>
        <nav className={styles.tools} aria-label="Fantasy tools">{tools.map(tool => <Link key={tool.name} href={tool.href}><ToolIcon name={tool.icon} /><span><strong>{tool.name}</strong><small>{tool.description}</small></span></Link>)}</nav>
      </div>
      <section className={styles.leagues} aria-labelledby="my-leagues-title">
        <div className={styles.sectionTitle}><h2 id="my-leagues-title">My Leagues</h2><Link href="/connect" aria-label="View all connected leagues">View all</Link></div>
        {connected && team ? <Link className={styles.leagueCard} href="/team"><span className={styles.leagueIcon}>{selected.source === "sleeper" ? <TeamAvatar name={team.teamName} avatarUrl={team.avatarUrl} ownerAvatarUrl={team.ownerAvatarUrl}/> : <ToolIcon name="league" />}</span><span className={styles.leagueCopy}><strong>{league.name}</strong><small>{selected.source === "yahoo" ? "Yahoo Fantasy" : "Sleeper"}{selected.source === "sleeper" && team.wins + team.losses + team.ties > 0 ? ` · ${team.wins}–${team.losses}${team.ties ? `–${team.ties}` : ""}` : ` · ${league.season}`}</small></span><span aria-hidden="true">›</span></Link>
          : <Link className={styles.leagueCard} href="/connect"><span className={styles.leagueIcon}><ToolIcon name="league" /></span><span className={styles.leagueCopy}><strong>{selected.hydrated ? "Connect your first league" : "Loading your leagues…"}</strong><small>Your actual team. Personalized advice.</small></span><span aria-hidden="true">›</span></Link>}
      </section>
      {connected && <div className={styles.sync}><span><span className={syncValid ? styles.syncDot : styles.pendingDot} aria-hidden="true" />{syncValid ? <><span>{data ? "Analysis updated " : "Roster synced "}</span><time dateTime={syncDate.toISOString()}>{syncDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></> : "No successful analysis yet"}</span><button className="text-button" disabled={state.loading} onClick={selected.source === "yahoo" ? undefined : state.refresh} hidden={selected.source === "yahoo"}>{state.loading ? "Checking…" : "Refresh"}</button>{selected.source === "yahoo" && <Link href="/connect">Refresh connection</Link>}</div>}
      {state.error && connected && <p className={styles.error} role="alert">{state.error} <Link href="/connect">Check your connection</Link></p>}
      {concerns.length > 0 && <section className={styles.concerns}><h2>Before kickoff</h2>{concerns.map(p => <p key={p!.playerId}><strong>{p!.fullName}</strong> · {p!.injuryStatus}</p>)}<small>Provider designations. Verify game-day availability in Sleeper.</small></section>}
      {moves.length > 1 && <section className={styles.secondary}><h2>Also worth a look</h2>{moves.slice(1).map(move => <details key={move.id}><summary>{move.title}</summary><p>{move.reason}</p><Link className="text-button" href={destination(move).href}>{destination(move).label} →</Link></details>)}</section>}
{primary && <details className={styles.notes}><summary>Why this move?</summary><p>{primary.reason}</p><p className="source-note">Based on Sleeper data and your league’s scoring. Projections are estimates.</p>{primary.playerId && data?.profiles[primary.playerId] && <PlayerDetails profile={data.profiles[primary.playerId]} snapshot={data.currentSnapshots.find(p => p.playerId === primary.playerId)} source={selected.source}>View player details</PlayerDetails>}</details>}
      {data?.warnings.length ? <details className={styles.notes}><summary>Data availability</summary>{data.warnings.map(w => <p key={w}>{w}</p>)}</details> : null}
    </div>
  </AppShell>;
}
