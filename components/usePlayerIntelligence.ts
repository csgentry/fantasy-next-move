"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useAnalysisSession} from "./PlayerAnalysisSession";
import type {ImportedLeague,LeagueProvider,PlayerIntelligencePayload} from "@/lib/types";
import {hasCurrentAnalysis} from '@/lib/decision-tools';
type Result={key:string;data:PlayerIntelligencePayload|null;error:string};
export function usePlayerIntelligence(league:ImportedLeague,source:LeagueProvider,rosterId?:number,mode?:'dashboard'){
 const {owner,load,peek}=useAnalysisSession();const [revision,setRevision]=useState(0);
 const scope=useMemo(()=>JSON.stringify([league.season,league.providerContext?.currentWeek,league.rosterPositions,league.scoringSettings,league.teams.map(t=>[t.rosterId,t.ownerId,t.players,t.starters,t.reserve,t.taxi])]),[league]);
 const refresh=useCallback(()=>setRevision(n=>n+1),[]);
 const baseKey=`${owner}:${source}:${league.leagueId}:${league.season}:${rosterId??'owner'}:${mode||'full'}:${scope}`;
 const key=`${baseKey}:${revision}`;
 const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{
  if(source!=='sleeper'||!owner)return;
  let cancelled=false;
  load(league.leagueId,rosterId,revision>0,mode,scope).then(data=>{if(!cancelled)setResult({key,data,error:''})}).catch(error=>{if(!cancelled)setResult({key,data:null,error:error instanceof Error?error.message:'Unable to load player analysis.'})});
  return()=>{cancelled=true};
 },[key,league.leagueId,source,rosterId,owner,load,revision,mode,scope]);
 const current=result?.key===key?result:null;
 const cached=owner?peek(league.leagueId,rosterId,mode,scope):null;
 const retained=cached?.season===Number(league.season)&&hasCurrentAnalysis(cached)&&(!league.providerContext?.currentWeek||league.providerContext.currentWeek===cached.projectionWeek)?cached:null;
 const data=source==='sleeper'?(current?.data??retained??null):null;
 return {refresh,data,loading:source==='sleeper'&&!current&&!data,refreshing:source==='sleeper'&&!current,error:current?.error??''};
}
