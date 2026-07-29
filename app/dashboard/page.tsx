"use client";

import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { RosterSnapshot } from "@/components/RosterSnapshot";
import { StatCard } from "@/components/StatCard";
import { contenderScore, rankTeams, recommendationsFor } from "@/lib/analysis";

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

  const ranking = rankTeams(league);
  const ownerRosterId = league.userRosterId ?? teamRosterId;
  const myTeam =
    ranking.find((team) => team.rosterId === ownerRosterId) ?? ranking[0];

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

  const score = contenderScore(myTeam, league);
  const recs = recommendationsFor(myTeam, league);
  const recordGames = myTeam.wins + myTeam.losses + myTeam.ties;
  const winPct =
    ((myTeam.wins + myTeam.ties * 0.5) / Math.max(recordGames, 1)) * 100;

  return (
    <AppShell>
      {source === "demo" && (
        <div className="connection-message demo-notice">
          <strong>Sample data:</strong> This is a fictional league used to
          preview the app. Connect a league to analyze your real roster.
        </div>
      )}

      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {source === "demo" ? "Sample league" : `${source} league`}
          </span>
          <h1>{league.name}</h1>
          <p>
            {league.season} season command center ·{" "}
            {leagueTypeLabel(league.leagueType)}
          </p>
        </div>
        <div className="source-actions">
          <div className="pill">
            Data source: {source === "demo" ? "Sample" : source === "yahoo" ? "Yahoo" : "Sleeper"}
          </div>
          {source !== "demo" && (
            <button className="text-button" onClick={resetLeague}>
              Close league
            </button>
          )}
        </div>
      </div>

      <section className="stats-grid">
        <StatCard
          label="Power rank"
          value={`#${myTeam.rank}`}
          detail={`of ${ranking.length} teams`}
        />
        <StatCard
          label="Contender score"
          value={`${score}/100`}
          detail={score >= 80 ? "Championship profile" : "Needs improvement"}
        />
        <StatCard
          label="Record"
          value={recordLabel(myTeam.wins, myTeam.losses, myTeam.ties)}
          detail={`${winPct.toFixed(1)}% result rate`}
        />
        <StatCard
          label="Point differential"
          value={`${myTeam.pointDiff >= 0 ? "+" : ""}${myTeam.pointDiff.toFixed(1)}`}
          detail={`${myTeam.pointsFor.toFixed(1)} points for`}
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel next-moves">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Your priority board</span>
              <h2>{myTeam.teamName}&apos;s Next Moves</h2>
            </div>
            <span className="pill">Your roster only</span>
          </div>
          {recs.map((rec, index) => (
            <article className="move-card" key={rec.title}>
              <div className="move-number">{index + 1}</div>
              <div>
                <div className="move-meta">
                  <span>{rec.category}</span>
                  <span>{rec.impact} impact</span>
                </div>
                <h3>{rec.title}</h3>
                <p>{rec.reason}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">League pulse</span>
              <h2>Power Rankings</h2>
            </div>
            <span className="pill">{ranking.length} teams</span>
          </div>
          <div className="ranking-list">
            {ranking.map((team) => {
              const isMyTeam = team.rosterId === myTeam.rosterId;
              return (
                <div
                  className={isMyTeam ? "ranking-row active" : "ranking-row"}
                  key={team.rosterId}
                >
                  <strong>{team.rank}</strong>
                  <div>
                    <b>{team.teamName}</b>
                    <small>
                      {team.ownerName}
                      {isMyTeam ? " · Your team" : ""}
                    </small>
                  </div>
                  <span>{recordLabel(team.wins, team.losses, team.ties)}</span>
                </div>
              );
            })}
          </div>
          <p className="ranking-note">
            Rankings are league context only. Personalized Next Moves remain
            private to your connected roster.
          </p>
        </div>
      </section>

      <RosterSnapshot team={myTeam} source={source} />
    </AppShell>
  );
}
