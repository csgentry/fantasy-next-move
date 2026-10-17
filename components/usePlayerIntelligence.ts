"use client";
import {useEffect,useState} from "react";
import type {ImportedLeague,LeagueProvider,PlayerIntelligencePayload} from "@/lib/types";
type Result={key:string;data:PlayerIntelligencePayload|null;error:string};
export function usePlayerIntelligence(league:ImportedLeague,source:LeagueProvider,rosterId?:number){
 const [revision,setRevision]=useState(0);
 const key=`${source}:${league.leagueId}:${rosterId ?? "owner"}:${revision}`;
 const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{
  if(source!=="sleeper")return;
  const controller=new AbortController();let cancelled=false;
  fetch("/api/sleeper/intelligence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leagueId:league.leagueId,rosterId}),signal:controller.signal})
   .then(async response=>{const payload=await response.json();if(!response.ok)throw Error(payload.error||"Unable to load player intelligence.");return payload as PlayerIntelligencePayload;})
   .then(data=>{if(!cancelled)setResult({key,data,error:""});})
   .catch(error=>{if(!cancelled)setResult({key,data:null,error:error instanceof Error?error.message:"Unable to load player intelligence."});});
  return()=>{cancelled=true;controller.abort();};
 },[key,league.leagueId,source,rosterId]);
 const current=result?.key===key?result:null;
 return {refresh:()=>setRevision(n=>n+1),data:source==="sleeper"?current?.data??null:null,loading:source==="sleeper"&&!current,error:current?.error??""};
}
