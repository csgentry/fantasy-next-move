import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getUserEntitlement,type UserEntitlement} from './billing/entitlements';
import {safeNextPath,PRODUCTION_ORIGIN} from './site-origin';

// Base authenticated/free access already includes Next Move. Premium tools retain
// their existing server entitlement gate; login never creates paid access.
export function destinationForEntitlement(entitlement:UserEntitlement,requested?:string|null){
  const next=safeNextPath(requested);
  const path=new URL(next,PRODUCTION_ORIGIN).pathname;
  const allowed=['/dashboard','/team','/trade-lab','/leagues','/waivers','/connect','/account','/more','/admin'];
  if(!allowed.includes(path))return '/dashboard';
  if(path==='/trade-lab'&&!entitlement.tradeLabAccess&&!entitlement.allAccess)return '/pricing?message='+encodeURIComponent('Pro access is required for full Trade Lab. Paid subscriptions are not available yet.');
  return next;
}
export async function authenticatedDestination(supabase:SupabaseClient,userId:string,requested?:string|null){
  return destinationForEntitlement(await getUserEntitlement(supabase,userId),requested);
}
