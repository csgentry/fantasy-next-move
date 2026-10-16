"use client";
import {useMemo,useState} from "react";
import {buildPowerRankings} from "@/lib/power-rankings";
import {demoPlayerPositions,tradePlayers} from "@/lib/demo-data";
import type {ImportedLeague,LeagueProvider,PlayerIntelligencePayload,PlayerProfile} from "@/lib/types";
type Props={league:ImportedLeague;source:LeagueProvider;myRosterId:number;intelligence?:PlayerIntelligencePayload|null;intelligenceLoading?:boolean;intelligenceError?:string};
function Rankings({league,source,myRosterId,intelligence,intelligenceLoading,intelligenceError}:Props){
 const [selectedId,setSelectedId]=useState(myRosterId);
 const profiles=useMemo(()=>{
  const embedded=Object.assign({},...league.teams.map(t=>t.playerProfiles || {})) as Record<string,PlayerProfile>;
  if(source!=="demo")return {...embedded,...(intelligence?.profiles||{})};
  const sampleRanks=new Map(tradePlayers.map((p,i)=>[p.name,i+1]));
  return Object.fromEntries(league.teams.flatMap(t=>t.players.map(name=>[name,{playerId:name,fullName:name,position:demoPlayerPositions[name]||"—",team:null,status:null,searchRank:sampleRanks.get(name)??null}])));
 },[league,source,intelligence?.profiles]);
 const rankings=useMemo(()=>buildPowerRankings(league,profiles,intelligence?.weeklyScores||[],intelligence?.currentSnapshots||[]),[league,profiles,intelligence]);
 const selected=rankings.find(t=>t.rosterId===selectedId)??rankings[0];
 if(!selected)return <section className="panel"><h2>No teams available</h2><p>Refresh your league once rosters are available.</p></section>;
 return <section className="panel"><div className="panel-heading"><div><span className="eyebrow">League context</span><h2>How your team compares</h2><p>Relative roster estimates. Select a team to see its strengths and weaknesses.</p></div></div>
 {intelligenceLoading&&<p role="status">Refreshing team analysis…</p>}{intelligenceError&&<p role="alert">Player analysis is temporarily unavailable. Current ranks may be limited.</p>}
 <div className="league-rank-list" aria-label="Team strength rankings">{[...rankings].sort((a,b)=>a.overallRank-b.overallRank).map(team=><button key={team.rosterId} className={`league-rank-row ${team.rosterId===selected.rosterId?"selected":""}`} aria-pressed={team.rosterId===selected.rosterId} onClick={()=>setSelectedId(team.rosterId)}><b>#{team.overallRank}</b><span><strong>{team.teamName}{team.rosterId===myRosterId?" · Your team":""}</strong><small>Starters #{team.starterRank} · Depth #{team.benchRank}</small></span><span>{team.confidence==="Limited"?"Low":team.confidence==="Medium"?"Moderate":"High"} confidence</span></button>)}</div>
 <details className="team-comparison-detail" open><summary>{selected.teamName} · Team analysis</summary><div className="snapshot-strip">{Object.entries(selected.positional).map(([position,metric])=><span key={position}>{position}<b>{metric.rank} of {league.teams.length}</b></span>)}</div><ul>{selected.explanations.slice(0,3).map(reason=><li key={reason}>{reason}</li>)}</ul><p className="muted">Rankings combine available player signals, lineup needs, depth, and league settings. Limited coverage reduces confidence; ranks are not championship probabilities.</p></details>
 </section>;
}
export function PowerRankingsEngine(props:Props){return <Rankings key={`${props.source}:${props.league.leagueId}:${props.myRosterId}`} {...props}/>;}
