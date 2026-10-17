"use client";
import {Suspense} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {YahooAttribution} from "@/components/YahooAttribution";
import {AppShell} from "@/components/AppShell";
import {useSelectedLeague} from "@/components/LeaguePicker";
import {RosterSnapshot} from "@/components/RosterSnapshot";
import {usePlayerIntelligence} from "@/components/usePlayerIntelligence";
import {LeagueContext} from "@/components/LeagueContext";
import {customerSleeperAvatar} from "@/lib/home-imagery";
import {StartSit} from "@/components/DecisionTools";
export default function TeamPage(){return <Suspense fallback={<AppShell><p role="status">Loading your team…</p></AppShell>}><TeamWorkspace/></Suspense>}
function TeamWorkspace(){const selected=useSelectedLeague();const intelligence=usePlayerIntelligence(selected.league,selected.source,selected.teamRosterId);const params=useSearchParams();const view=params.get('view')||'roster';const league=intelligence.data?.currentLeague||selected.league;const team=league.teams.find(t=>t.rosterId===selected.teamRosterId);
 if(selected.hydrated&&selected.source==='demo')return <AppShell><section className="panel empty-state"><h1>No league connected</h1><p>{selected.error||'Connect your league to review your roster.'}</p><Link className="button" href="/connect">Connect league</Link></section></AppShell>;
 return <AppShell profileAvatarUrl={customerSleeperAvatar(league)}><section className="team-workspace"><div className="page-heading"><div><h1>My Team</h1><p>{selected.hydrated?team?.teamName||'Team unavailable':'Loading your team'}</p></div>{view!=='lineup'&&<Link className="button" href="/team?view=lineup">Optimize lineup →</Link>}</div>{!selected.hydrated?<p role="status">Loading your team…</p>:<><LeagueContext selected={selected} data={intelligence.data}/><nav className="workspace-tabs" aria-label="Team views">{[['Roster','roster'],['Projections','projections'],['Stats','stats'],['Schedule','schedule'],['Start/Sit','lineup']].map(([label,key])=><Link key={key} href={key==='roster'?'/team':`/team?view=${key}`} aria-current={view===key?'page':undefined}>{label}</Link>)}</nav>{selected.error&&<p role="alert">{selected.error}</p>}{intelligence.loading&&<p role="status">Refreshing player analysis…</p>}{intelligence.error&&<p role="alert">{intelligence.error}</p>}{selected.source==='yahoo'&&<YahooAttribution/>}{team&&(view==='lineup'?<StartSit key={league.leagueId} league={league} team={team} data={intelligence.data}/>:view==='schedule'?<section className="panel"><h2>Schedule</h2><p>NFL opponents, kickoff times and bye weeks are not provided by the verified feed. We do not fill these with sample matchups.</p><p className="muted">Check your connected provider for the current schedule. Roster projections and Start/Sit remain available in the tabs above.</p></section>:<RosterSnapshot team={team} league={league} source={selected.source} intelligence={intelligence.data} view={view==='stats'?'stats':view==='projections'?'projections':'roster'}/>)}<div className="sync-row"><span>{intelligence.data?`Last analysis: ${new Date(intelligence.data.syncedAt).toLocaleString()}`:'Awaiting current analysis'}</span><button className="text-button" disabled={intelligence.loading} onClick={intelligence.refresh}>Refresh analysis</button></div></>}</section></AppShell>;
}
