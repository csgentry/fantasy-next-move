"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {createClient} from "@/lib/supabase/client";
import type {PlayerIntelligencePayload} from "@/lib/types";
import {AccountMemory} from '@/lib/account-memory';
import {loadActiveLeagueFromAccount} from '@/lib/account-storage';
type Selection=Awaited<ReturnType<typeof loadActiveLeagueFromAccount>>;
type Entry={at:number;value?:PlayerIntelligencePayload;promise:Promise<PlayerIntelligencePayload>;controller:AbortController;pending:boolean};
type Mode='dashboard'|undefined;
const cacheKey=(leagueId:string,rosterId:number|undefined,mode:Mode,scope='')=>`${leagueId}:${rosterId??'owner'}:${mode||'full'}:${scope}`;
type SelectionSession={clearAccount:()=>void;accountReady:boolean;peekSelection:(owner:string|null)=>Selection|undefined;loadSelection:(owner:string|null)=>Promise<Selection>;rememberSelection:(owner:string|null,value:Selection)=>void};
const Context=createContext<SelectionSession&{owner:string|null;peek:(leagueId:string,rosterId:number|undefined,mode?:Mode,scope?:string)=>PlayerIntelligencePayload|null;load:(leagueId:string,rosterId:number|undefined,refresh:boolean,mode?:Mode,scope?:string)=>Promise<PlayerIntelligencePayload>}>({owner:null,clearAccount:()=>{},accountReady:false,peekSelection:()=>undefined,loadSelection:async()=>null,rememberSelection:()=>{},peek:()=>null,load:async()=>{throw Error('Analysis session is not ready.')}});
export function PlayerAnalysisSession({children}:{children:ReactNode}){
 const [,notifySelection]=useState<Selection|undefined>(undefined);
 const cache=useRef(new Map<string,Entry>());const generation=useRef(0);const [owner,setOwner]=useState<string|null>(null);
 const selection=useRef(new AccountMemory<Selection>());const [accountReady,setAccountReady]=useState(()=>!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
 const clear=useCallback(()=>{generation.current++;cache.current.forEach(entry=>entry.controller.abort());cache.current.clear();selection.current.clear();notifySelection(undefined)},[]);
 const clearAccount=useCallback(()=>{clear();setOwner(null);setAccountReady(false)},[clear]);
 const peekSelection=useCallback((key:string|null)=>selection.current.peek(key),[]);
 const loadSelection=useCallback((key:string|null)=>selection.current.load(key,loadActiveLeagueFromAccount).then(value=>{if(selection.current.peek(key)===value)notifySelection(value);return value}),[]);
 const rememberSelection=useCallback((key:string|null,value:Selection)=>{selection.current.remember(key,value);if(selection.current.peek(key)===value)notifySelection(value)},[]);
 useEffect(()=>{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return;
  let currentOwner:string|null=null;
  const {data}=createClient().auth.onAuthStateChange((_event,session)=>{const next=session?.user.id||null;if(next!==currentOwner){clear();currentOwner=next;const key=next?`${next}:${generation.current}`:null;selection.current.setOwner(key);setOwner(key)}setAccountReady(true)});
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('fnm-session'):null;
  if(channel)channel.onmessage=event=>{if(event.data==='signed-out'){clearAccount();window.location.replace('/login')}};
  window.addEventListener('pagehide',clear);
  return()=>{channel?.close();data.subscription.unsubscribe();window.removeEventListener('pagehide',clear);clear()};
 },[clear,clearAccount]);
 const peek=useCallback((leagueId:string,rosterId:number|undefined,mode?:Mode,scope?:string)=>{const entry=cache.current.get(cacheKey(leagueId,rosterId,mode,scope));return entry&&Date.now()-entry.at<5*60*1000?entry.value??null:null},[]);
 const load=useCallback((leagueId:string,rosterId:number|undefined,refresh:boolean,mode?:Mode,scope?:string)=>{
  const key=cacheKey(leagueId,rosterId,mode,scope);const existing=cache.current.get(key);
  if(existing&&(existing.pending||(!refresh&&Date.now()-existing.at<5*60*1000)))return existing.promise;
  existing?.controller.abort();const controller=new AbortController();const epoch=generation.current;
  if(cache.current.size>=40){const oldest=cache.current.keys().next().value;if(oldest){cache.current.get(oldest)?.controller.abort();cache.current.delete(oldest);}}
  const promise=fetch('/api/sleeper/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({leagueId,rosterId,mode}),signal:controller.signal}).then(async response=>{const payload=await response.json();if(!response.ok)throw Error(payload.error||'Unable to load player analysis.');if(generation.current!==epoch)throw Error('Account changed. Refresh your analysis.');const entry=cache.current.get(key);if(entry?.promise===promise){entry.value=payload;entry.at=Date.now();entry.pending=false;}return payload as PlayerIntelligencePayload}).catch(error=>{if(cache.current.get(key)?.promise===promise)cache.current.delete(key);throw error});
  cache.current.set(key,{at:existing?.at??Date.now(),value:existing?.value,promise,controller,pending:true});return promise;
 },[]);
 return <Context.Provider value={{owner,load,peek,clearAccount,accountReady,peekSelection,loadSelection,rememberSelection}}>{children}</Context.Provider>;
}
export function useAnalysisSession(){return useContext(Context)}
