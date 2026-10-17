"use client";
import {useEffect,useId,useRef,useState} from "react";
import {PlayerAvatar} from "./PlayerAvatar";
import type {PlayerProfile,PlayerWeeklySnapshot} from "@/lib/types";

type Props={profile:PlayerProfile;snapshot?:PlayerWeeklySnapshot;source:string;children?:React.ReactNode;showAvatar?:boolean};
const statLabels:Record<string,string>={pass_yd:'Passing yards',pass_td:'Passing TDs',pass_int:'Interceptions',rush_att:'Rushing attempts',rush_yd:'Rushing yards',rush_td:'Rushing TDs',rec:'Receptions',rec_yd:'Receiving yards',rec_td:'Receiving TDs',rec_tgt:'Targets'};
const views=['Overview','Projections','Stats'] as const;
type View=typeof views[number];

export function PlayerDetails({profile,snapshot,source,children,showAvatar=false}:Props){
 const headingId=useId();const tabsId=useId();
 const [open,setOpen]=useState(false);const [view,setView]=useState<View>('Overview');
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open){dialog.current?.showModal();dialog.current?.scrollTo(0,0);}else if(dialog.current?.open)dialog.current.close();},[open]);
 useEffect(()=>{if(!open)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before;};},[open]);
 const stats=Object.entries((view==='Projections'?snapshot?.projectionStats:snapshot?.actualStats)||{}).filter(([key,value])=>key in statLabels&&Number.isFinite(value));
 const hasProjection=snapshot?.projectedPoints!=null&&Number.isFinite(snapshot.projectedPoints);
 const sourceName=source==='demo'?'Controlled fictional example':source==='yahoo'?'Yahoo Fantasy':'Sleeper';
 return <><button className={`player-name-button ${showAvatar?'player-identity-button':''}`} onClick={()=>{setView('Overview');setOpen(true);}} aria-haspopup="dialog">{showAvatar&&<PlayerAvatar profile={profile}/>}<span className="player-trigger-name">{children||profile.fullName}</span></button>{open&&<dialog ref={dialog} className="player-dialog player-sheet" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} aria-labelledby={headingId}>
  <header className="player-dialog-header"><span className="eyebrow">Player profile</span><button className="text-button" autoFocus onClick={()=>setOpen(false)} aria-label="Close player details">Close ×</button></header>
  <div className="player-profile-hero"><PlayerAvatar profile={profile} large/><div><span className="player-team-label">{profile.position} · {profile.team||'NFL team unavailable'}</span><h2 id={headingId}>{profile.fullName}</h2>{profile.injuryStatus?<span className="player-health">{profile.injuryStatus}</span>:<span className="player-profile-source">{sourceName} player information</span>}</div></div>
  <div className="player-detail-tabs" role="tablist" aria-label="Player information">{views.map(label=><button key={label} id={`${tabsId}-${label}`} role="tab" aria-selected={view===label} aria-controls={`${tabsId}-panel`} tabIndex={view===label?0:-1} onClick={()=>setView(label)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?views.length-1:(views.indexOf(label)+(event.key==='ArrowRight'?1:-1)+views.length)%views.length;setView(views[next]);document.getElementById(`${tabsId}-${views[next]}`)?.focus();}}>{label}</button>)}</div>
  <div className="player-detail-body" id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${view}`} tabIndex={0}>
   {view==='Overview'?<>
    <div className="player-overview-metrics"><div className="player-key-stat"><span>{snapshot?`Week ${snapshot.week} projection`:'Weekly projection'}</span><strong>{hasProjection?`${snapshot!.projectedPoints!.toFixed(1)} pts`:'Unavailable'}</strong><small>{hasProjection?'Your league’s scoring':'Awaiting reliable data'}</small></div>{snapshot?.previousActualPoints!=null&&Number.isFinite(snapshot.previousActualPoints)&&<div className="player-key-stat"><span>Previous scored week</span><strong>{snapshot.previousActualPoints.toFixed(1)} pts</strong><small>Actual fantasy points</small></div>}</div>
    <section className="player-outlook"><h3>Current outlook</h3><p>{hasProjection?'Compare this projection with eligible players in Start/Sit. Your league’s scoring and starting slots determine the best fit.':'A reliable weekly projection is not available. No projected advantage is claimed.'}</p>{profile.injuryStatus&&<p className="inline-alert">Provider injury designation: {profile.injuryStatus}. Verify availability before kickoff.</p>}{profile.practiceParticipation&&<p>Practice participation: {profile.practiceParticipation}</p>}</section>
    {(profile.age!=null||profile.yearsExperience!=null)&&<dl className="player-bio">{profile.age!=null&&<div><dt>Age</dt><dd>{profile.age}</dd></div>}{profile.yearsExperience!=null&&<div><dt>NFL experience</dt><dd>{profile.yearsExperience} {profile.yearsExperience===1?'year':'years'}</dd></div>}</dl>}
   </>:<section><div className="player-stat-heading"><h3>{snapshot?`Week ${snapshot.week} ${view==='Projections'?'projections':'statistics'}`:view==='Projections'?'Weekly projections':'Statistics'}</h3><span>{view==='Projections'?'Estimate':'Recorded'}</span></div>{view==='Projections'&&<div className="player-key-stat"><span>Fantasy points</span><strong>{hasProjection?`${snapshot!.projectedPoints!.toFixed(1)} pts`:'Unavailable'}</strong></div>}{stats.length?<dl className="player-stats">{stats.map(([key,value])=><div key={key}><dt>{statLabels[key]}</dt><dd>{Number.isInteger(value)?value:value.toFixed(1)}</dd></div>)}</dl>:<div className="player-data-empty"><strong>{view==='Projections'?'No detailed projection breakdown':'No completed-game statistics yet'}</strong><p>{view==='Projections'?'Only verified values are shown. A total may be available without individual projected statistics.':'Recorded statistics for this week will appear when the connected feed supplies them.'}</p></div>}</section>}
   <details className="player-data-notes"><summary>Data sources & limitations</summary><p>Source: {sourceName}.{snapshot?.syncedAt?` Checked ${new Date(snapshot.syncedAt).toLocaleString()}.`:''}</p><p>Projections are estimates. NFL opponent, kickoff and bye-week data are not supplied by this feed. No independently verified news feed or licensed player photography is connected.</p></details>
  </div>
  <footer className="player-sheet-footer"><button className="button" onClick={()=>setOpen(false)}>Back to analysis</button></footer>
 </dialog>}</>;
}
