import {fantasyAnalyticsSuppressed} from "./transient-provider-state";
export const CLIENT_EVENTS = new Set(["homepage_viewed","signup_started","provider_connection_started","provider_connected","league_selected","first_recommendation_shown","trade_lab_opened","trade_analyzed","pricing_viewed","dashboard_viewed","recommendation_opened"]);
export async function trackProductEvent(eventName:string){
 if(fantasyAnalyticsSuppressed() || !CLIENT_EVENTS.has(eventName))return;
 if(typeof window!=="undefined") {
  const target=window as Window & {gtag?:(...args:unknown[])=>void};
  // The consent component is the only place that initializes GA4.
  if(target.gtag)target.gtag("event",eventName,{page_location:location.origin+location.pathname,page_referrer:"",page_title:"FantasyNextMove"});
 }
 await fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventName}),keepalive:true}).catch(()=>undefined);
}
