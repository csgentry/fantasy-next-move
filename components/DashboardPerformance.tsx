'use client';
import {useEffect,useRef} from 'react';

// Opt-in diagnostics only. No telemetry request, customer identifiers or source
// payloads are recorded. This leaves normal navigation and rendering unchanged.
export function DashboardPerformance({leagueReady,analysisReady}:{leagueReady:boolean;analysisReady:boolean}){
 const reported=useRef(new Set<string>());
 useEffect(()=>{
  if(new URLSearchParams(location.search).get('performance')!=='1')return;
  const log=(name:string,value:unknown)=>console.info('FNM_PERFORMANCE '+JSON.stringify({name,value}));
  const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  if(navigation)log('navigation',{ttfbMs:navigation.responseStart-navigation.requestStart,documentMs:navigation.responseEnd-navigation.startTime,domInteractiveMs:navigation.domInteractive});
  const observers:PerformanceObserver[]=[];
  for(const type of ['paint','largest-contentful-paint','longtask']){
   if(!PerformanceObserver.supportedEntryTypes.includes(type))continue;
   const observer=new PerformanceObserver(list=>list.getEntries().forEach(entry=>log(type,{name:entry.name,startMs:Math.round(entry.startTime),durationMs:Math.round(entry.duration)})));
   observer.observe({type,buffered:true});observers.push(observer);
  }
  return()=>observers.forEach(observer=>observer.disconnect());
 },[]);
 useEffect(()=>{
  if(new URLSearchParams(location.search).get('performance')!=='1')return;
  for(const [name,ready] of [['league-ready',leagueReady],['analysis-ready',analysisReady]] as const){
   if(!ready||reported.current.has(name))continue;
   reported.current.add(name);console.info('FNM_PERFORMANCE '+JSON.stringify({name,value:Math.round(performance.now())}));
   if(name==='analysis-ready'){
    const entries=performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    console.info('FNM_PERFORMANCE '+JSON.stringify({name:'resources',value:entries.filter(entry=>new URL(entry.name).origin===location.origin).map(entry=>({path:new URL(entry.name).pathname,ms:Math.round(entry.duration),bytes:entry.transferSize})).filter(entry=>entry.path.startsWith('/api/')||entry.path.endsWith('.js'))}));
   }
  }
 },[leagueReady,analysisReady]);
 return null;
}
