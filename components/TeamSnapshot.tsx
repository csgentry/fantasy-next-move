import {buildPowerRankings} from "@/lib/power-rankings";
import type {ImportedLeague,PlayerIntelligencePayload} from "@/lib/types";
export function TeamSnapshot({league,rosterId,data}:{league:ImportedLeague;rosterId:number;data:PlayerIntelligencePayload|null}){
 if(!data)return <section className="panel"><h2>Team snapshot</h2><p>Position comparisons appear when player analysis is available. Standings alone cannot identify your weakest position.</p></section>;
 const rankings=buildPowerRankings(league,data.profiles,data.weeklyScores,data.currentSnapshots);
 const team=rankings.find(t=>t.rosterId===rosterId);
 if(!team)return null;
 if(team.playerCoverage<.5)return <section className="panel"><h2>Team snapshot</h2><p>Player coverage is limited. Review the roster before acting on a position ranking.</p></section>;
 const positions=Object.entries(team.positional).filter(([position])=>league.rosterPositions.some(slot=>slot===position));
 const sorted=positions.sort((a,b)=>a[1].rank-b[1].rank);
 const best=sorted[0],weakest=sorted[sorted.length-1];
 return <section className="panel"><h2>Your team at a glance</h2><div className="snapshot-strip"><span>Overall strength<b>{team.overallRank} of {league.teams.length}</b></span>{best&&<span>Best position<b>{best[0]} · {best[1].rank} of {league.teams.length}</b></span>}{weakest&&<span>Biggest weakness<b>{weakest[0]} · {weakest[1].rank} of {league.teams.length}</b></span>}<span>Starting lineup<b>{team.starterRank<=league.teams.length/2?"Above league median":"Below league median"}</b></span><span>Depth<b>{team.benchRank<=league.teams.length/2?"Above league median":"Below league median"}</b></span></div><p className="muted">Relative model estimates, not win probabilities. {team.confidence === "Limited" ? "Low" : team.confidence === "Medium" ? "Moderate" : "High"} confidence.</p></section>;
}
