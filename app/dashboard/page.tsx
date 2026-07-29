"use client";

import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { PowerRankingsEngine } from "@/components/PowerRankingsEngine";
import { RosterSnapshot } from "@/components/RosterSnapshot";
import { StatCard } from "@/components/StatCard";
import { recommendationsFor } from "@/lib/analysis";

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

  if (!hydrated) {
    return (
      <AppShell>
        <div className="panel empty-state">
          <strong>Loading your league…</strong>
        </div>
      </AppShell>
    );
  }

  const ownerRosterId = league.userRosterId ?? teamRosterId;
  const myTeam = league.teams.find((team) => team.rosterId === ownerRosterId) ?? league.teams[0];

  if (!myTeam) {
    return (
      <AppShell>
        <div className="panel empty-state">
          <strong>No rosters found.</strong>
          <p>Reconnect the league after rosters have been created.</p>
        </div>
      </AppShell>
    );
  }

  const recs = recommendationsFor(myTeam, league);
  const recordGames = myTeam.wins + myTeam.losses + myTeam.ties;
  const winPct = ((myTeam.wins + myTeam.ties * 0.5) / Math.max(recordGames, 1)) * 100;
  const pointDiff = myTeam.pointsFor - myTeam.pointsAgainst;

  return (
    <AppShell>
      {source === "demo" && (
        <div className="connection-message demo-notice">
          <strong>Sample data:</strong> This is a fictional league used to preview the app. Connect a league to analyze your real roster.
        </div>
      )}

      <div className="page-heading">
        <div>
          <span className="eyebrow">{source === "demo" ? "Sample league" : `${source} league`}</span>
          <h1>{league.name}</h1>
          <p>{league.season} season command center · {leagueTypeLabel(league.leagueType)}</p>
        </div>
        <div className="source-actions">
          <div className="pill">Data source: {source === "demo" ? "Sample" : source === "yahoo" ? "Yahoo" : "Sleeper"}</div>
          {source !== "demo" && <button className="text-button" onClick={resetLeague}>Close league</button>}
        </div>
      </div>

      <section className="stats-grid">
        <StatCard label="Record" value={recordLabel(myTeam.wins, myTeam.losses, myTeam.ties)} detail={`${winPct.toFixed(1)}% result rate`} />
        <StatCard label="Points for" value={myTeam.pointsFor.toFixed(1)} detail={`${(myTeam.pointsFor / Math.max(recordGames, 1)).toFixed(1)} per matchup`} />
        <StatCard label="Point differential" value={`${pointDiff >= 0 ? "+" : ""}${pointDiff.toFixed(1)}`} detail={`${myTeam.pointsAgainst.toFixed(1)} points against`} />
        <StatCard label="League format" value={leagueTypeLabel(league.leagueType)} detail={`${league.totalRosters} teams`} />
      </section>

      <section className="panel next-moves dashboard-priority-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Your priority board</span>
            <h2>{myTeam.teamName}&apos;s Next Moves</h2>
          </div>
          <span className="pill">Your roster only</span>
        </div>
        <div className="priority-grid">
          {recs.map((rec, index) => (
            <article className="move-card" key={rec.title}>
              <div className="move-number">{index + 1}</div>
              <div>
                <div className="move-meta"><span>{rec.category}</span><span>{rec.impact} impact</span></div>
                <h3>{rec.title}</h3>
                <p>{rec.reason}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PowerRankingsEngine league={league} source={source} myRosterId={myTeam.rosterId} />

      <RosterSnapshot team={myTeam} source={source} />
    </AppShell>
  );
}
