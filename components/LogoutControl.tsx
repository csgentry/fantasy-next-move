"use client";
import {useState} from 'react';
import {endSession} from '@/app/auth/actions';
import {useAnalysisSession} from './PlayerAnalysisSession';
import {useYahooSession} from './YahooSession';

export function LogoutControl({className='drawer-logout'}:{className?:string}){
 const [pending,setPending]=useState(false);const [error,setError]=useState('');
 const session=useAnalysisSession();const yahoo=useYahooSession();
 return <form action={async()=>{
   if(pending)return;setPending(true);setError('');
   try{
    const result=await endSession();
    if(result.error){setError(result.error);setPending(false);return}
    session.clearAccount();yahoo.select(null);
    try{if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('fnm-session');channel.postMessage('signed-out');channel.close()}}catch{/* Document navigation still clears this browser's state. */}
    // A document navigation also discards client router and component state.
    window.location.replace('/');
   }catch{setError('Unable to log out. Please try again.');setPending(false)}
 }}><button type="submit" className={className} disabled={pending}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></svg><span>{pending?'Logging out…':'Log Out'}</span></button>{error&&<p role="alert">{error}</p>}</form>;
}
