"use client";
import {YahooAttribution} from "@/components/YahooAttribution";
import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { RosterSnapshot } from "@/components/RosterSnapshot";
import { usePlayerIntelligence } from "@/components/usePlayerIntelligence";
export default function TeamPage() {
  const {league, source, teamRosterId, setTeamRosterId, hydrated, error} = useSelectedLeague();
  const intelligence = usePlayerIntelligence(league, source);
  const team = league.teams.find(t => t.rosterId === teamRosterId);
  if(hydrated && source === "demo") return <AppShell><section className="panel empty-state"><h1>No league connected</h1><p>{error || "Connect your league to review your roster."}</p><a className="button" href="/connect">Connect League</a></section></AppShell>;
  return <AppShell><div className="page-heading"><div><h1>My Team</h1><p>Review the roster behind your next decision.</p></div></div>
    {!hydrated ? <p>Loading your team…</p> : <>
      {error && <p className="connection-message">{error}</p>}
      <label className="team-selector">Team <select value={teamRosterId} onChange={event => setTeamRosterId(Number(event.target.value))}>{league.teams.map(t => <option key={t.rosterId} value={t.rosterId}>{t.teamName}</option>)}</select></label>
      {source === "yahoo" && <YahooAttribution/>}{team && <RosterSnapshot team={team} league={league} source={source} intelligence={intelligence.data} />}
    </>}
  </AppShell>;
}
