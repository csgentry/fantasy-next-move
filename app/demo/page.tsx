import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PowerRankingsEngine } from "@/components/PowerRankingsEngine";
import { RosterSnapshot } from "@/components/RosterSnapshot";
import { StatCard } from "@/components/StatCard";
import { recommendationsFor } from "@/lib/analysis";
import { demoLeague } from "@/lib/demo-data";

export default function DemoPage() {
  const myTeam = demoLeague.teams.find((team) => team.rosterId === demoLeague.userRosterId) || demoLeague.teams[0];
  const recommendations = recommendationsFor(myTeam, demoLeague);

  return (
    <AppShell>
      <div className="connection-message demo-notice">
        <strong>Fictional product demo:</strong> No real league, live player market, or private account data is used on this page.
        <Link className="text-button" href="/pricing">View paid plans</Link>
      </div>

      <div className="page-heading">
        <div>
          <span className="eyebrow">Sample dynasty league</span>
          <h1>{demoLeague.name}</h1>
          <p>{demoLeague.season} product preview · fictional managers and rosters</p>
        </div>
        <div className="pill">Data source: Sample</div>
      </div>

      <section className="stats-grid">
        <StatCard label="Projected lineup" value="142.20" detail="Example league-scored projection" />
        <StatCard label="Overall Power" value="#2" detail="Balanced current and future strength" />
        <StatCard label="Win Now" value="#1" detail="Example championship outlook" />
        <StatCard label="Dynasty Future" value="#4" detail="Example long-term franchise value" />
      </section>

      <section className="panel next-moves dashboard-priority-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Sample priority board</span><h2>{myTeam.teamName}&apos;s Next Moves</h2></div>
          <span className="pill">Fictional example</span>
        </div>
        <div className="priority-grid">
          {recommendations.map((recommendation, index) => (
            <article className="move-card intelligence-move-card" key={`${recommendation.category}:${index}`}>
              <div className="move-number">{index + 1}</div>
              <div>
                <div className="move-meta"><span>{recommendation.category}</span><span>{recommendation.impact} impact</span></div>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.reason}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PowerRankingsEngine league={demoLeague} source="demo" myRosterId={myTeam.rosterId} />
      <RosterSnapshot team={myTeam} league={demoLeague} source="demo" />

      <section className="panel pricing-guarantee">
        <div><span className="eyebrow">Ready for your real league?</span><h2>Choose Trade Lab or All Access.</h2><p>Real league imports, saved analysis, and current market values require a paid or complimentary account.</p></div>
        <Link className="button" href="/pricing">See pricing</Link>
      </section>
    </AppShell>
  );
}
