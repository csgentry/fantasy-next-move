"use client";
import {useEffect,useState} from "react";
import {useAnalysisSession} from "./PlayerAnalysisSession";
import type {ImportedLeague,LeagueProvider,PlayerIntelligencePayload} from "@/lib/types";
type Result={key:string;data:PlayerIntelligencePayload|null;error:string};
export function usePlayerIntelligence(league:ImportedLeague,source:LeagueProvider,rosterId?:number){
 const {owner,load}=useAnalysisSession();const [revision,setRevision]=useState(0);
 const key=`${owner}:${source}:${league.leagueId}:${rosterId??'owner'}:${revision}`;
 const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{
  if(source!=='sleeper'||!owner)return;
  let cancelled=false;
  load(league.leagueId,rosterId,revision>0).then(data=>{if(!cancelled)setResult({key,data,error:''})}).catch(error=>{if(!cancelled)setResult({key,data:null,error:error instanceof Error?error.message:'Unable to load player analysis.'})});
  return()=>{cancelled=true};
 },[key,league.leagueId,source,rosterId,owner,load,revision]);
 const current=result?.key===key?result:null;
 return {refresh:()=>setRevision(n=>n+1),data:source==='sleeper'?current?.data??null:null,loading:source==='sleeper'&&!current,error:current?.error??''};
}
