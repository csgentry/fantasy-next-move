"use client";
import {useState} from 'react';
import Link from 'next/link';
import {PlayerDetails} from './PlayerDetails';
import {fantasySchedule,finite,recordedPlayerWeeks,playerStatSummary} from '@/lib/team-insights';
import type {ImportedLeague,LeagueTeam,PlayerIntelligencePayload} from '@/lib/types';
type Props={team:LeagueTeam;league:ImportedLeague;data?:PlayerIntelligencePayload|null;view:'stats'|'schedule'};
export function TeamInsights({team,league,data,view}:Props){
 const [chosen,setChosen]=useState<number|null>(null);
 const history=recordedPlayerWeeks(team,data);const schedule=fantasySchedule(team,data);
 const weeks=[...new Set(view==='stats'?history.map(row=>row.week):schedule.map(row=>row.week))].sort((a,b)=>b-a);
 const week=chosen&&weeks.includes(chosen)?chosen:weeks[0];
 const rows=history.filter(row=>row.week===week);const matchup=schedule.find(row=>row.week===week);
 return <section className="team-insights panel" aria-labelledby={`team-${view}-title`}>
  <div className="panel-heading"><div><span className="eyebrow">{view==='stats'?'Recorded results':'Verified fantasy matchup periods'}</span><h2 id={`team-${view}-title`}>{view==='stats'?'Player performance':'League schedule'}</h2></div>{weeks.length>0&&<label className="insight-week">Fantasy week<select value={week} onChange={event=>setChosen(Number(event.target.value))}>{weeks.map(value=><option key={value} value={value}>Week {value}</option>)}</select></label>}</div>
  {view==='stats'?rows.length?<><div className="stats-columns" aria-hidden="true"><span>Player</span><span>Actual</span><span>Projected</span></div>{rows.map(row=>{
   const profile=data?.profiles[row.playerId]||team.playerProfiles?.[row.playerId]||{playerId:row.playerId,fullName:row.playerName,position:row.position,team:row.nflTeam,status:null};
   const detail=playerStatSummary(row);
   return <article key={row.playerId} className="team-stat-row"><div><PlayerDetails profile={profile} snapshot={row} source={league.provider} showAvatar/><small>{row.position} · {row.nflTeam||'NFL team unavailable'}</small>{detail&&<p>{detail}</p>}</div><div aria-label="Actual fantasy points"><strong>{row.actualPoints!.toFixed(1)}</strong><small>actual</small></div><div aria-label="Historical projected fantasy points"><strong>{finite(row.projectedPoints)?row.projectedPoints.toFixed(1):'—'}</strong><small>projected</small></div></article>;
  })}<p className="insight-note">Week {week} recorded results · {rows.length} rostered players with verified points. Projections are the forecast for that week. Season totals and averages are omitted where a complete season history is unavailable.</p></>:<div className="insight-empty"><h3>No recorded player results available</h3><p>Historical statistics will appear when your connected feed supplies a completed week. Weekly projections remain in Roster and player details.</p></div>:<>
   {matchup?<article className="schedule-matchup"><span className="pill">{matchup.completed?'Completed fantasy week':'Current fantasy week'}</span><h3>Week {matchup.week} · {league.season}</h3><div><section><span>{team.teamName}</span><strong>{matchup.own.points.toFixed(2)}</strong></section><span>vs.</span><section><span>{league.teams.find(row=>row.rosterId===matchup.opponent?.rosterId)?.teamName||'Opponent unavailable'}</span><strong>{matchup.opponent&&finite(matchup.opponent.points)?matchup.opponent.points.toFixed(2):'—'}</strong></section></div><small>{matchup.completed?'Recorded fantasy scores':'Current scores, not projected final totals'}</small><Link className="text-button" href="/leagues">View league details →</Link></article>:<div className="insight-empty"><h3>League schedule not yet available</h3><p>Known fantasy matchup periods will appear after synchronization. No future opponent or score is assumed.</p></div>}
   <div className="schedule-limit"><h3>NFL game schedule unavailable</h3><p>The current verified connection does not supply player opponents, kickoff times, home/away or bye-week information. Check your fantasy provider for NFL game scheduling. Start/Sit remains available for supported lineup comparisons.</p><Link href="/team?view=lineup">Open Start/Sit →</Link></div>
  </>}
 </section>;
}
