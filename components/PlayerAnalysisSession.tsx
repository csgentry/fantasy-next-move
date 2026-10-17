"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {createClient} from "@/lib/supabase/client";
import type {PlayerIntelligencePayload} from "@/lib/types";
type Entry={at:number;promise:Promise<PlayerIntelligencePayload>;controller:AbortController};
const Context=createContext<{owner:string|null;load:(leagueId:string,rosterId:number|undefined,refresh:boolean)=>Promise<PlayerIntelligencePayload>}>({owner:null,load:async()=>{throw Error('Analysis session is not ready.')}});
export function PlayerAnalysisSession({children}:{children:ReactNode}){
 const cache=useRef(new Map<string,Entry>());const generation=useRef(0);const [owner,setOwner]=useState<string|null>(null);
 const clear=useCallback(()=>{generation.current++;cache.current.forEach(entry=>entry.controller.abort());cache.current.clear()},[]);
 useEffect(()=>{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return;
  let currentOwner:string|null=null;
  const {data}=createClient().auth.onAuthStateChange((_event,session)=>{const next=session?.user.id||null;if(next!==currentOwner){clear();currentOwner=next;setOwner(next?`${next}:${generation.current}`:null)}});
  window.addEventListener('pagehide',clear);
  return()=>{data.subscription.unsubscribe();window.removeEventListener('pagehide',clear);clear()};
 },[clear]);
 const load=useCallback((leagueId:string,rosterId:number|undefined,refresh:boolean)=>{
  const key=`${leagueId}:${rosterId??'owner'}`;const existing=cache.current.get(key);
  if(!refresh&&existing&&Date.now()-existing.at<5*60*1000)return existing.promise;
  existing?.controller.abort();const controller=new AbortController();const epoch=generation.current;
  const promise=fetch('/api/sleeper/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({leagueId,rosterId}),signal:controller.signal}).then(async response=>{const payload=await response.json();if(!response.ok)throw Error(payload.error||'Unable to load player analysis.');if(generation.current!==epoch)throw Error('Account changed. Refresh your analysis.');return payload as PlayerIntelligencePayload}).catch(error=>{if(cache.current.get(key)?.promise===promise)cache.current.delete(key);throw error});
  cache.current.set(key,{at:Date.now(),promise,controller});return promise;
 },[]);
 return <Context.Provider value={{owner,load}}>{children}</Context.Provider>;
}
export function useAnalysisSession(){return useContext(Context)}
