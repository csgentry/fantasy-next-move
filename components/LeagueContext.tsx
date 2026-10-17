"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {loadSavedLeaguesFromAccount,type SavedLeagueRecord} from "@/lib/account-storage";
import {useSelectedLeague} from "./LeaguePicker";
import type {PlayerIntelligencePayload} from "@/lib/types";
export function LeagueContext({selected,data}:{selected:ReturnType<typeof useSelectedLeague>;data?:PlayerIntelligencePayload|null}){
 const [saved,setSaved]=useState<SavedLeagueRecord[]>([]);const [switching,setSwitching]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{let active=true;if(selected.source==='sleeper')loadSavedLeaguesFromAccount().then(rows=>{if(active)setSaved(rows)}).catch(()=>{if(active)setError('League list unavailable. Your current selection is unchanged.')});return()=>{active=false}},[selected.source]);
 async function change(id:string){const record=saved.find(r=>r.id===id);if(!record)return;setSwitching(true);setError('');try{await selected.setLeague(record.raw_data,record.selected_roster_id)}catch{setError('Could not change leagues. Try again.')}finally{setSwitching(false)}}
 return <section className="league-context" aria-label="Selected league and week"><div>{saved.length>1?<label>League<select disabled={switching} value={saved.find(r=>r.raw_data.leagueId===selected.league.leagueId)?.id||''} onChange={e=>change(e.target.value)}>{saved.map(r=><option value={r.id} key={r.id}>{r.name} · {r.season}</option>)}</select></label>:<><span className="context-label">Selected league</span><strong>{selected.league.name}</strong></>}</div><span className="context-week">{data?`Week ${data.projectionWeek} · ${data.season}`:selected.league.season}</span><Link href="/leagues">Change league</Link>{error&&<p role="alert">{error}</p>}</section>;
}
