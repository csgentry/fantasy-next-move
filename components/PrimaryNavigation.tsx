"use client";
import Link from 'next/link';
import {Suspense} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {ToolIcon} from './ToolIcon';
const destinations=[
 {label:'My Team',href:'/team',icon:'team'},
 {label:'Trade Lab',href:'/trade-lab',icon:'trade'},
 {label:'Next Move',href:'/dashboard',icon:'home'},
 {label:'Start/Sit',href:'/team?view=lineup',icon:'lineup'},
 {label:'League',href:'/leagues',icon:'league'}
] as const;
function Links({path,lineup}:{path:string;lineup:boolean}){return <nav aria-label="Primary navigation">{destinations.map(item=>{
 const active=item.href==='/team?view=lineup'?path==='/team'&&lineup:item.href==='/team'?path==='/team'&&!lineup:path===item.href;
 return <Link key={item.href} href={item.href} aria-current={active?'page':undefined} className={[active?'active':'',item.href==='/dashboard'?'signature-destination':''].filter(Boolean).join(' ')}><ToolIcon name={item.icon}/><span>{item.label}</span></Link>;
})}</nav>}
function Current(){const path=usePathname();const params=useSearchParams();return <Links path={path} lineup={params.get('view')==='lineup'}/>}
export function PrimaryNavigation(){const path=usePathname();return <Suspense fallback={<Links path={path} lineup={false}/>}><Current/></Suspense>}
