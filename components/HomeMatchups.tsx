'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {TeamAvatar} from './TeamAvatar';
import {ProviderAvatar} from './ProviderAvatar';
import {matchupRefreshDelay} from '@/lib/home-dashboard';
import {forecastMatchup} from '@/lib/matchup-forecast';
import type {HomeMatchup} from '@/lib/sleeper/home-matchups';
import type {ImportedLeague,PlayerIntelligencePayload} from '@/lib/types';
import styles from '@/app/dashboard/dashboard.module.css';

export function HomeMatchups({selectedLeague,analysis,onSelect,onWeek,enabled=true}: {selectedLeague:ImportedLeague;analysis:PlayerIntelligencePayload|null;onSelect:(league:ImportedLeague,rosterId?:number|null)=>Promise<void>;onWeek:(week:number|null)=>void;enabled?:boolean}) {
 const router=useRouter();
 const [cards,setCards]=useState<HomeMatchup[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[opening,setOpening]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!enabled)return;
  let cancelled=false,inFlight=false,lastAttempt=0;
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  async function refresh(){
   if(cancelled||inFlight||document.visibilityState==='hidden')return;
   inFlight=true;lastAttempt=Date.now();clearTimeout(timer);
   let delay=5*60*1000;
   try{
    const response=await fetch('/api/account/matchups',{cache:'no-store',headers:{Accept:'application/x-ndjson'},signal:controller.signal});
    if(response.status===401){if(!cancelled){setCards([]);setError('');}return;}
    if(!response.ok){const payload=await response.json();throw new Error(payload.error||'Unable to refresh matchups.');}
    let next:HomeMatchup[];
    if(response.headers.get('content-type')?.includes('application/x-ndjson')&&response.body){
      const reader=response.body.getReader(),decoder=new TextDecoder(),received=new Map<number,HomeMatchup>();let buffer='';
      const publish=(line:string)=>{if(!line.trim())return;const row=JSON.parse(line) as {index:number;matchup:HomeMatchup};received.set(row.index,row.matchup);if(!cancelled)setCards(previous=>{const updates=new Map([...received.values()].map(card=>[card.league.leagueId,card]));return [...previous.map(card=>{const value=updates.get(card.league.leagueId)||card;updates.delete(card.league.leagueId);return value;}),...updates.values()];});};
      try{while(!cancelled){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const lines=buffer.split('\n');buffer=lines.pop()||'';lines.forEach(publish);if(done){publish(buffer);break;}}}finally{if(cancelled)await reader.cancel();reader.releaseLock();}
      next=[...received.entries()].sort(([a],[b])=>a-b).map(([,card])=>card);
    }else{const payload=await response.json();next=payload.matchups as HomeMatchup[];}
    delay=matchupRefreshDelay(next.map(c=>c.status));
    if(!cancelled){setCards(next);setError(next.some(c=>!c.syncedAt)?'Some leagues could not be refreshed.':'');}
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Unable to refresh matchups.');}
   finally{inFlight=false;if(!cancelled){setLoading(false);timer=setTimeout(refresh,delay);}}
  }
  const visible=()=>{if(document.visibilityState==='visible'&&Date.now()-lastAttempt>=30000)void refresh();};
  void refresh();document.addEventListener('visibilitychange',visible);window.addEventListener('focus',visible);
  return()=>{cancelled=true;controller.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible);};
 },[revision,enabled]);
 useEffect(()=>{onWeek(cards.find(c=>c.league.leagueId===selectedLeague.leagueId)?.week??null);},[cards,selectedLeague.leagueId,onWeek]);
 async function open(card:HomeMatchup,detail:boolean){
  if(!card.own)return;
  setOpening(card.league.leagueId);setError('');
  try{await onSelect(card.league,card.rosterId);if(detail)router.push('/leagues');}
  catch{setError('We couldn’t switch leagues. Your previous selection is unchanged.');}
  finally{setOpening('');}
 }
 const updatedAt=cards.flatMap(card=>card.syncedAt?[card.syncedAt]:[]).sort()[0];
 return <section className={styles.leagues} aria-labelledby="my-leagues-title">
  <div className={styles.sectionTitle}><h2 id="my-leagues-title">My Leagues</h2><Link href="/leagues">View All</Link></div>
  {loading&&!cards.length?<p className={styles.empty} role="status">Loading your connected leagues…</p>:null}
  {!loading&&!cards.length&&!error&&<Link className={styles.leagueCard} href="/connect"><span className={styles.leagueCopy}><strong>Connect your first league</strong><small>Your actual team. Personalized advice.</small></span><span aria-hidden="true">›</span></Link>}
  <div className={styles.matchupList}>{cards.map(card=>{
   const active=card.league.leagueId===selectedLeague.leagueId;
   const forecast=forecastMatchup(card,analysis);
   const ownProjection=forecast.own,opponentProjection=forecast.opponent;
   return <article className={`${styles.matchupCard} ${active?styles.selectedCard:''}`} key={`${card.league.leagueId}:${card.league.season}`} aria-label={`${card.league.name}${active?' · selected league':''}`}>
    <div className={styles.matchupHeader}>
     <span className={styles.headerAvatar}><ProviderAvatar kind="league" name={card.league.name} url={card.leagueAvatarUrl}/></span>
     <div className={styles.leagueCopy}><h3>{card.league.name}</h3><p>Sleeper{card.record?` · ${card.record}`:''}{card.own?.rank?` · #${card.own.rank}`:''}{card.week?` · Week ${card.week}`:''}</p></div>
     <div className={styles.cardHeaderActions}>{card.status&&<span className={styles.status} data-status={card.status}>{card.status==='Live'?'● ':''}{card.status}</span>}{!active&&<button disabled={!!opening||!card.own} onClick={()=>open(card,false)}>Select</button>}</div>
    </div>
    <div className={styles.matchupNames}><strong>{card.own?.teamName||'Team unavailable'}</strong><strong>{card.opponent?.teamName||'Opponent pending'}</strong></div>
    <div className={styles.scoreboard}>
     <span className={styles.teamAvatar}>{card.own&&<TeamAvatar name={card.own.teamName} avatarUrl={card.own.avatarUrl} ownerAvatarUrl={card.own.ownerAvatarUrl}/>}</span>
     <div className={styles.scoreColumn}><small>{card.status==='Final'?'Final score':'Current score'}</small><strong>{card.score==null?'—':card.score.toFixed(2)}</strong>{card.status!=='Final'&&<span className={styles.ownProjection}>{ownProjection?.toFixed(2)??'—'} <small>Est. final</small></span>}</div>
     <span className={styles.versus} aria-hidden="true">vs</span>
     <div className={styles.scoreColumn}><small>{card.status==='Final'?'Final score':'Current score'}</small><strong>{card.opponentScore==null?'—':card.opponentScore.toFixed(2)}</strong>{card.status!=='Final'&&<span className={styles.opponentProjection}>{opponentProjection?.toFixed(2)??'—'} <small>Est. final</small></span>}</div>
     <span className={styles.teamAvatar}>{card.opponent&&<TeamAvatar name={card.opponent.teamName} avatarUrl={card.opponent.avatarUrl} ownerAvatarUrl={card.opponent.ownerAvatarUrl}/>}</span>
    </div>
    {forecast.percent!=null&&card.status!=='Final'?<div className={styles.probabilityBlock}>
     <div className={styles.probabilityLabels}><span><b>{forecast.percent}%</b> WIN</span><span><b>{100-forecast.percent}%</b> WIN</span></div>
     <div className={styles.winBar} role="img" aria-label={`${card.own?.teamName}: ${forecast.percent}% estimated win chance; ${card.opponent?.teamName}: ${100-forecast.percent}%`}><span className={styles.ownChance} style={{width:`${forecast.percent}%`}}/><span className={styles.rivalChance} style={{width:`${100-forecast.percent}%`}}/></div>
    </div>:null}
    {card.note&&<p className={styles.cardNote}>{card.note}</p>}
    <div className={styles.matchupFooter}><small>{forecast.percent!=null&&card.status!=='Final'?'Estimated win chance · FNM':card.status==='Final'?'Final score':!active?'Select league for estimates':'Estimates unavailable'}</small><button disabled={!!opening||!card.own} onClick={()=>open(card,true)}>{opening===card.league.leagueId?'Opening…':'View Matchup →'}</button></div>
   </article>;
  })}</div>
  {selectedLeague.provider==='yahoo'&&<div className={styles.leagueCard}><div className={styles.leagueCopy}><strong>{selectedLeague.name}</strong><small>Yahoo Fantasy · Weekly matchups pending authorized API availability.</small></div><Link href="/leagues">View league →</Link></div>}
  {updatedAt&&<p className={styles.leagueUpdated}>Scores updated <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time></p>}
  {error&&<p className={styles.error} role="alert">{error} {cards.length>0&&'Check the update time before relying on displayed scores.'}<button className={styles.retry} onClick={()=>{setLoading(true);setRevision(r=>r+1);}} disabled={loading}>{loading?'Retrying…':'Retry matchups'}</button></p>}
 </section>;
}
