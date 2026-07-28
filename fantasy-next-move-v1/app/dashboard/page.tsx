"use client";

import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { RosterSnapshot } from "@/components/RosterSnapshot";
import { StatCard } from "@/components/StatCard";
import { contenderScore, rankTeams, recommendationsFor } from "@/lib/analysis";

export default function DashboardPage() {
  const { league, source, teamRosterId, setTeamRosterId, resetLeague } = useSelectedLeague();
  const ranking = rankTeams(league);
  const myTeam = ranking.find((team) => team.rosterId === teamRosterId) ?? ranking[0];

  if (!myTeam) {
    return <AppShell><div className="panel empty-state"><strong>No rosters found.</strong><p>Reconnect the league after rosters have been created.</p></div></AppShell>;
  }

  const score = contenderScore(myTeam, league);
  const recs = recommendationsFor(myTeam, league);
  const recordGames = myTeam.wins + myTeam.losses + myTeam.ties;
  const winPct = ((myTeam.wins + myTeam.ties * 0.5) / Math.max(recordGames, 1)) * 100;

  return (
    <AppShell>
      <div className="page-heading">
        <div><span className="eyebrow">{source === "demo" ? "Demo league" : `${source} league`}</span><h1>{league.name}</h1><p>{league.season} season command center</p></div>
        <div className="heading-actions">
          <label className="team-switcher"><span>Analyzing</span><select value={myTeam.rosterId} onChange={(event) => setTeamRosterId(Number(event.target.value))}>{league.teams.map((team) => <option key={team.rosterId} value={team.rosterId}>{team.teamName} · {team.ownerName}</option>)}</select></label>
          <div className="source-actions"><div className="pill">Data source: {source === "demo" ? "Demo" : source === "yahoo" ? "Yahoo" : "Sleeper"}</div>{source !== "demo" && <button className="text-button" onClick={resetLeague}>Close league</button>}</div>
        </div>
      </div>

      <section className="stats-grid">
        <StatCard label="Power rank" value={`#${myTeam.rank}`} detail={`of ${league.totalRosters} teams`} />
        <StatCard label="Contender score" value={`${score}/100`} detail={score >= 80 ? "Championship profile" : "Needs improvement"} />
        <StatCard label="Record" value={`${myTeam.wins}-${myTeam.losses}${myTeam.ties ? `-${myTeam.ties}` : ""}`} detail={`${winPct.toFixed(1)}% result rate`} />
        <StatCard label="Point differential" value={`${myTeam.pointDiff >= 0 ? "+" : ""}${myTeam.pointDiff.toFixed(1)}`} detail={`${myTeam.pointsFor.toFixed(1)} points for`} />
      </section>

      <section className="dashboard-grid">
        <div className="panel next-moves">
          <div className="panel-heading"><div><span className="eyebrow">Priority board</span><h2>{myTeam.teamName}&apos;s Next Moves</h2></div><span className="pill">Updated now</span></div>
          {recs.map((rec, index) => (
            <article className="move-card" key={rec.title}>
              <div className="move-number">{index + 1}</div>
              <div><div className="move-meta"><span>{rec.category}</span><span>{rec.impact} impact</span></div><h3>{rec.title}</h3><p>{rec.reason}</p></div>
            </article>
          ))}
        </div>

        <div className="panel">
          <div className="panel-heading"><div><span className="eyebrow">League pulse</span><h2>Power Rankings</h2></div></div>
          <div className="ranking-list">
            {ranking.slice(0, 6).map((team) => (
              <button className={team.rosterId === myTeam.rosterId ? "ranking-row active" : "ranking-row"} key={team.rosterId} onClick={() => setTeamRosterId(team.rosterId)}>
                <strong>{team.rank}</strong>
                <div><b>{team.teamName}</b><small>{team.ownerName}</small></div>
                <span>{team.wins}-{team.losses}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <RosterSnapshot team={myTeam} source={source} />
    </AppShell>
  );
}
