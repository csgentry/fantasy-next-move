import 'server-only';
import {unstable_cache} from 'next/cache';
import {gzip, gunzip} from 'node:zlib';
import {promisify} from 'node:util';

const compress=promisify(gzip), decompress=promisify(gunzip);
type Packed={at:number;body:string};
// Only anonymous NFL feeds belong here. Never cache account responses, credentials,
// league ownership, entitlements or recommendations in this shared cache.
const allowed=/^https:\/\/(?:api\.sleeper\.app\/v1\/players\/nfl\?active=true|api\.sleeper\.com\/(?:projections|stats)\/nfl\/\d{4}\/\d{1,2}\?season_type=(?:regular|post|pre))$/;
const pending=new Map<string,Promise<unknown>>();
const profileKeys=['player_id','full_name','first_name','last_name','position','fantasy_positions','team','status','injury_status','practice_participation','depth_chart_position','age','years_exp','search_rank'];
function compactProfile(value:unknown){
 if(!value||typeof value!=='object')return value;
 const row=value as Record<string,unknown>;
 return Object.fromEntries(profileKeys.filter(key=>row[key]!==undefined).map(key=>[key,row[key]]));
}
function compactFeed(url:string,value:unknown):unknown{
 if(!value||typeof value!=='object')return value;
 if(url.includes('/players/nfl'))return Object.fromEntries(Object.entries(value).map(([id,profile])=>[id,compactProfile(profile)]));
 if(Array.isArray(value))return value.map(row=>row&&typeof row==='object'?{...row,player:compactProfile(row.player)}:row);
 const record=value as Record<string,unknown>;
 if(Array.isArray(record.data))return {...record,data:compactFeed(url,record.data)};
 return Object.fromEntries(Object.entries(record).map(([id,row])=>[id,row&&typeof row==='object'?{...row,player:compactProfile((row as Record<string,unknown>).player)}:row]));
}
async function download(url:string):Promise<Packed>{
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error(`Sleeper request failed (${response.status}).`);
 const bytes=await compress(Buffer.from(JSON.stringify(compactFeed(url,await response.json()))));
 const body=bytes.toString('base64');
 // These feeds exceed Next's raw-response cache limit. Compressed entries fit,
 // without dropping any scoring keys, players or source precision.
 if(Buffer.byteLength(body)>1900000)throw Error('Sleeper feed exceeds the safe cache budget.');
 return {at:Date.now(),body};
}
export async function publicSleeperFeed<T>(url:string,ttl:number):Promise<T>{
 if(!allowed.test(url))throw Error('Only public NFL feeds may use the shared feed cache.');
 const seconds=Math.max(30,Math.min(86400,ttl));
 const bucket=Math.floor(Date.now()/(seconds*1000));
 const key=`${url}:${seconds}:${bucket}`;
 const existing=pending.get(key);
 if(existing)return existing as Promise<T>;
 const promise=(async()=>{
  // An explicit time bucket bounds age, including when Next serves stale data
  // during revalidation. Failures are rejected and never retained as successes.
  const cached=unstable_cache(download,['sleeper-public-gzip-v1',String(seconds),String(bucket)],{revalidate:seconds*2});
  let packed=await cached(url);
  if(Date.now()-packed.at>seconds*1000)packed=await download(url);
  return JSON.parse((await decompress(Buffer.from(packed.body,'base64'))).toString()) as T;
 })();
 pending.set(key,promise);
 try{return await promise;}finally{if(pending.get(key)===promise)pending.delete(key);}
}
