"use client";
import {useYahooSession} from "./YahooSession";
import {useEffect,useSyncExternalStore} from "react";
const CONSENT="fnm:analytics-consent";
function read(){try{return localStorage.getItem(CONSENT)||"unset";}catch{return "denied";}}
function subscribe(update:()=>void){window.addEventListener("storage",update);window.addEventListener("fnm-consent",update);return()=>{window.removeEventListener("storage",update);window.removeEventListener("fnm-consent",update);};}
export function AnalyticsConsent(){
 const yahoo = useYahooSession();
 const consent=useSyncExternalStore(subscribe,read,()=>"unset");
 const id=process.env.NEXT_PUBLIC_GA4_ID;
 const enabled=process.env.NEXT_PUBLIC_ENABLE_GA4==="true" && /^G-[A-Z0-9]+$/.test(id||"");
 useEffect(()=>{
  if(yahoo.selection || !enabled || consent!=="granted")return;
  const target=window as Window & {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void};
  target.dataLayer=target.dataLayer||[];
  target.gtag=(...args:unknown[])=>target.dataLayer?.push(args);
  target.gtag("js",new Date());
  target.gtag("config",id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+location.pathname,page_referrer:"",page_title:"FantasyNextMove"});
  const script=document.createElement("script");script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${id}`;document.head.appendChild(script);
  return()=>{target.gtag=undefined;script.remove();};
 },[consent,enabled,id,yahoo.selection]);
 function choose(value:string){try{localStorage.setItem(CONSENT,value);window.dispatchEvent(new Event("fnm-consent"));}catch{}}
 if(!enabled || yahoo.selection)return null;
 return <aside className="analytics-consent" aria-label="Analytics preferences">{consent==="unset"?<><p>Allow optional analytics? We send product events, never your roster or email. Core functionality works without it.</p><button className="button small" onClick={()=>choose("granted")}>Allow analytics</button><button className="text-button" onClick={()=>choose("denied")}>No thanks</button></>:<button className="text-button" onClick={()=>choose(consent==="granted"?"denied":"granted")}>Optional analytics: {consent==="granted"?"on — turn off":"off — turn on"}</button>}</aside>;
}
