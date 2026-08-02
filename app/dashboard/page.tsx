"use client";

import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { PowerRankingsEngine } from "@/components/PowerRankingsEngine";
import { RosterSnapshot } from "@/components/RosterSnapshot";
import { StatCard } from "@/components/StatCard";
import { usePlayerIntelligence } from "@/components/usePlayerIntelligence";
import { recommendationsFor } from "@/lib/analysis";
import {
  buildPersonalizedPlayerRecommendations,
  projectedTeamTotal
} from "@/lib/player-intelligence";
import type { PlayerRecommendation } from "@/lib/types";

function leagueTypeLabel(type: "redraft" | "keeper" | "dynasty" | undefined) {
  if (type === "dynasty") return "Dynasty";
  if (type === "keeper") return "Keeper";
  return "Redraft";
}

function recordLabel(wins: number, losses: number, ties: number) {
  return `${wins}-${losses}${ties ? `-${ties}` : ""}`;
}

export default function DashboardPage() {
  const { league, source, teamRosterId, resetLeague, hydrated } = useSelectedLeague();
  const intelligenceState = usePlayerIntelligence(league, source);

  if (!hydrated) {
    return <AppShell><div className="panel empty-state"><strong>Loading your league…</strong></div></AppShell>;
  }

  const ownerRosterId = league.userRosterId ?? teamRosterId;
  const myTeam = league.teams.find((team) => team.rosterId === ownerRosterId) ?? league.teams[0];
  if (!myTeam) {
    return <AppShell><div className="panel empty-state"><strong>No rosters found.</strong><p>Reconnect the league after rosters have been created.</p></div></AppShell>;
  }

  const data = intelligenceState.data;
  const genericRecommendations = recommendationsFor(myTeam, league).map((recommendation, index) => ({
    ...recommendation,
    id: `fallback:${index}`,
    confidence: "Limited" as const
  }));
  const recommendations: PlayerRecommendation[] = data
    ? buildPersonalizedPlayerRecommendations(league, myTeam, data)
    : genericRecommendations;
  const recordGames = myTeam.wins + myTeam.losses + myTeam.ties;
  const winPct = ((myTeam.wins + myTeam.ties * 0.5) / Math.max(recordGames, 1)) * 100;
  const pointDiff = myTeam.pointsFor - myTeam.pointsAgainst;
  const projectedTotal = data ? projectedTeamTotal(myTeam, league, data) : null;
  const accuracy = data?.accuracy;

  return (
    <AppShell>
      {source === "demo" && <div className="connection-message demo-notice"><strong>Sample data:</strong> This is a fictional league used to preview the app. Connect a league to analyze your real roster.</div>}
      <div className="page-heading">
        <div><span className="eyebrow">{source === "demo" ? "Sample league" : `${source} league`}</span><h1>{league.name}</h1><p>{league.season} season command center · {leagueTypeLabel(league.leagueType)}</p></div>
        <div className="source-actions"><div className="pill">Data source: {source === "demo" ? "Sample" : source === "yahoo" ? "Yahoo" : "Sleeper"}</div>{source !== "demo" && <button className="text-button" onClick={resetLeague}>Close league</button>}</div>
      </div>

      <section className="stats-grid">
        {recordGames === 0 ? (
          <>
            <StatCard label="Projected lineup" value={projectedTotal === null ? "Loading" : projectedTotal.toFixed(2)} detail={data ? `Week ${data.projectionWeek} league-scored projection` : "Weekly projections load after connection"} />
            <StatCard label="Roster size" value={`${myTeam.players.length}`} detail={`${myTeam.starters.length} imported starters`} />
            <StatCard label="League size" value={`${league.totalRosters} teams`} detail={`${league.rosterPositions.length} configured roster slots`} />
            <StatCard label="League format" value={leagueTypeLabel(league.leagueType)} detail="Preseason baseline" />
          </>
        ) : (
          <>
            <StatCard label="Record" value={recordLabel(myTeam.wins, myTeam.losses, myTeam.ties)} detail={`${winPct.toFixed(1)}% result rate`} />
            <StatCard label="Points for" value={myTeam.pointsFor.toFixed(2)} detail={`${(myTeam.pointsFor / Math.max(recordGames, 1)).toFixed(2)} per matchup`} />
            <StatCard label="Point differential" value={`${pointDiff >= 0 ? "+" : ""}${pointDiff.toFixed(2)}`} detail={`${myTeam.pointsAgainst.toFixed(2)} points against`} />
            <StatCard label="League format" value={leagueTypeLabel(league.leagueType)} detail={`${league.totalRosters} teams`} />
          </>
        )}
      </section>

      {source === "sleeper" && (
        <section className="panel intelligence-summary-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Sleeper Player Intelligence</span><h2>{data ? `Week ${data.projectionWeek} projection center` : "Loading weekly player data"}</h2></div>
            <span className="pill">League-specific scoring</span>
          </div>
          {intelligenceState.error && <div className="connection-message error">{intelligenceState.error}</div>}
          {intelligenceState.loading && <div className="connection-message">Importing Sleeper projections, actual stats, and weekly history…</div>}
          {data && (
            <>
              <div className="intelligence-metric-grid">
                <div><span>Optimized lineup</span><strong>{projectedTotal === null ? "N/A" : projectedTotal.toFixed(2)}</strong><small>Projected Week {data.projectionWeek} points</small></div>
                {accuracy?.week ? <div><span>Projection accuracy</span><strong>{accuracy.meanAbsoluteError === null ? "N/A" : `${accuracy.meanAbsoluteError.toFixed(2)} MAE`}</strong><small>Week {accuracy.week} · {accuracy.sampleSize} players</small></div> : <div><span>Projection accuracy</span><strong>Starts after Week 1</strong><small>Actual-stat comparison begins after a completed scoring period</small></div>}
                {accuracy?.week ? <div><span>Within 5 points</span><strong>{accuracy.withinFivePointsPct === null ? "N/A" : `${accuracy.withinFivePointsPct.toFixed(1)}%`}</strong><small>Projection-versus-actual hit rate</small></div> : <div><span>Projection coverage</span><strong>{Math.round((data.currentSnapshots.filter((snapshot) => snapshot.rostered && snapshot.projectedPoints !== null).length / Math.max(myTeam.players.length, 1)) * 100)}%</strong><small>Rostered players with a current projection</small></div>}
                <div><span>Last updated</span><strong>{new Date(data.syncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><small>{data.storageStatus === "saved" ? "Weekly history active" : "Database migration required"}</small></div>
              </div>
              {data.storageStatus === "migration-required" && <div className="connection-message error">Run <strong>supabase/migrations/20260729_player_intelligence.sql</strong> in Supabase to preserve weekly snapshots. Live projections still load, but history will not be saved until the migration is applied.</div>}
              {data.warnings.length > 0 && <div className="intelligence-warning">{data.warnings.join(" ")}</div>}
            </>
          )}
        </section>
      )}

      <section className="panel next-moves dashboard-priority-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Your priority board</span><h2>{myTeam.teamName}&apos;s Next Moves</h2></div>
          <span className="pill">Your roster only</span>
        </div>
        <div className="priority-grid">
          {recommendations.map((recommendation, index) => (
            <article className="move-card intelligence-move-card" key={recommendation.id}>
              <div className="move-number">{index + 1}</div>
              <div>
                <div className="move-meta"><span>{recommendation.category}</span><span>{recommendation.impact} impact</span><span>{recommendation.confidence} confidence</span></div>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.reason}</p>
                {recommendation.projectedGain !== null && recommendation.projectedGain !== undefined && <small className="projected-gain">Projected gain: +{recommendation.projectedGain.toFixed(2)} points</small>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <PowerRankingsEngine
        league={league}
        source={source}
        myRosterId={myTeam.rosterId}
        intelligence={data}
        intelligenceLoading={intelligenceState.loading}
        intelligenceError={intelligenceState.error}
      />

      <RosterSnapshot team={myTeam} league={league} source={source} intelligence={data} />
    </AppShell>
  );
}
