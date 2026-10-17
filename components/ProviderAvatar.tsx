'use client';
import Image from 'next/image';
import {useState} from 'react';
import {sleeperAvatarUrl} from '@/lib/sleeper-avatar';
import {ToolIcon} from './ToolIcon';

// UI imagery only. Approved FantasyNextMove branding is never routed here.
export function ProviderAvatar({url,name,kind}:{url?:string|null;name:string;kind:'account'|'league'}) {
 const [failed,setFailed]=useState<string|null>(null);
 const src=sleeperAvatarUrl(url);
 if(src&&src!==failed)return <Image src={src} width={40} height={40} unoptimized alt={`${name} · Sleeper ${kind} image`} onError={()=>setFailed(src)}/>;
 return kind==='league'?<ToolIcon name="league"/>:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></svg>;
}
