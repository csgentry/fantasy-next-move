"use client";

import {EventTracker} from "@/components/EventTracker";
import Link from "next/link";
import {YahooAttribution} from "@/components/YahooAttribution";
import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { PowerRankingsEngine } from "@/components/PowerRankingsEngine";
import { usePlayerIntelligence } from "@/components/usePlayerIntelligence";
import { recommendationsFor } from "@/lib/analysis";
import {
  buildPersonalizedPlayerRecommendations
} from "@/lib/player-intelligence";
import type { PlayerRecommendation } from "@/lib/types";

function leagueTypeLabel(type: "redraft" | "keeper" | "dynasty" | undefined) {
  if (type === "dynasty") return "Dynasty";
  if (type === "keeper") return "Keeper";
  return "Redraft";
}

export default function DashboardPage() {
  const { league, source, teamRosterId, resetLeague, hydrated, error } = useSelectedLeague();
  const intelligenceState = usePlayerIntelligence(league, source, teamRosterId);

  if (!hydrated) {
    return <AppShell><div className="panel empty-state"><strong>Loading your league…</strong></div></AppShell>;
  }

  if (source === "demo") return <AppShell><section className="panel empty-state"><h1>No league connected</h1><p>{error || "Connect your fantasy league to understand your team and see your highest-priority move."}</p><Link className="button" href="/connect">Connect League</Link><Link className="text-button" href="/demo">See the fictional preview</Link></section></AppShell>;

  const ownerRosterId = teamRosterId;
  const myTeam = league.teams.find((team) => team.rosterId === ownerRosterId) ?? league.teams[0];
  if (!myTeam) {
    return <AppShell><div className="panel empty-state"><strong>No rosters found.</strong><p>Reconnect the league after rosters have been created.</p></div></AppShell>;
  }

  const data = intelligenceState.data;
  const genericRecommendations = recommendationsFor(myTeam, league).slice(0,1).map((recommendation, index) => ({
    ...recommendation,
    id: `fallback:${index}`,
    confidence: "Limited" as const
  }));
  const recommendations: PlayerRecommendation[] = data
    ? data.nextMoves ?? buildPersonalizedPlayerRecommendations(league, myTeam, data)
    : source === "yahoo" ? [{id: "yahoo-review", category: "Lineup", impact: "Medium", confidence: "Limited", title: "Review your starting lineup", reason: "Check the starter and bench statuses in your current Yahoo roster. Independent weekly projections are not available yet, so we cannot estimate a lineup gain.", projectedGain: null}] : genericRecommendations;

  return (
    <AppShell><EventTracker event="dashboard_viewed"/>{data?.nextMoves?.length ? <EventTracker event="first_recommendation_shown"/> : null}

      <div className="page-heading">
        <div><span className="eyebrow">{`${source} league`}</span><h1>Your Next Move</h1><p>{league.name} · {league.season} · {leagueTypeLabel(league.leagueType)}</p></div>
        <div className="source-actions"><div className="pill">Data source: {source === "yahoo" ? "Yahoo" : "Sleeper"}</div>{<button className="text-button" onClick={resetLeague}>Close league</button>}</div>
      </div>

      {intelligenceState.loading && <p role="status">Analyzing your roster…</p>}{intelligenceState.error && <p role="alert">{intelligenceState.error} <Link href="/connect">Refresh your league</Link></p>}
      <section className="panel next-moves dashboard-priority-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Your priority board</span><h2>{myTeam.teamName}&apos;s Next Moves</h2></div>

        </div>
        <div className="priority-grid">
          {recommendations.map((recommendation, index) => (
            <article className="move-card intelligence-move-card" key={recommendation.id}>
              <div className="move-number">{index + 1}</div>
              <div>

                <h3>{recommendation.title}</h3>
                <p>{recommendation.reason.split(/(?<=[.!?])\s/)[0]}</p><details><summary>Why this move?</summary><p>{recommendation.reason}</p><small>{recommendation.confidence === "Limited" ? "Limited" : recommendation.confidence} confidence</small></details><Link className="button small" href={recommendation.category === "Trade" && data?.pro ? "/trade-lab" : "/team"}>{recommendation.category === "Trade" && data?.pro ? "Open Trade Lab" : "Review My Team"}</Link>
                {recommendation.projectedGain !== null && recommendation.projectedGain !== undefined && <small className="projected-gain">Projected gain: +{recommendation.projectedGain.toFixed(1)} points</small>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {source === "yahoo" && <YahooAttribution/>}{data?.pro === false && <p>Your free plan includes your highest-priority move. <Link href="/pricing">Explore Pro</Link> for the full recommendation stack.</p>}
      {source !== "yahoo" && <details className="panel"><summary>Team strength and league context</summary>
      <PowerRankingsEngine
        league={league}
        source={source}
        myRosterId={myTeam.rosterId}
        intelligence={data}
        intelligenceLoading={intelligenceState.loading}
        intelligenceError={intelligenceState.error}
      />

      </details>}
    </AppShell>
  );
}
