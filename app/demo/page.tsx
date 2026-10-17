import {PreviewDecisionTools} from "@/components/PreviewDecisionTools";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PowerRankingsEngine } from "@/components/PowerRankingsEngine";
import { RosterSnapshot } from "@/components/RosterSnapshot";
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

      <section id="sample-analysis" className="panel next-moves dashboard-priority-panel">
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

      <PreviewDecisionTools/><details className="panel"><summary>Explore team strength</summary><PowerRankingsEngine league={demoLeague} source="demo" myRosterId={myTeam.rosterId} />
      </details><details className="panel"><summary>Explore the roster</summary><RosterSnapshot team={myTeam} league={demoLeague} source="demo" />

      </details><section className="panel pricing-guarantee">
        <div><span className="eyebrow">Ready for your real league?</span><h2>Preview FantasyNextMove Pro.</h2><p>Real league imports, saved analysis, and current market values require a paid or complimentary account.</p></div>
        <Link className="button" href="/pricing">See pricing</Link>
      </section>
    </AppShell>
  );
}
