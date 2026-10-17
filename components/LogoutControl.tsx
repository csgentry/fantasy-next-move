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
 }}><button type="submit" className={className} disabled={pending}>{pending?'Logging out…':'Log Out'}<span aria-hidden="true">↗</span></button>{error&&<p role="alert">{error}</p>}</form>;
}
