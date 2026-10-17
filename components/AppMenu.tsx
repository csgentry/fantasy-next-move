"use client";

import Link from "next/link";
import {usePathname, useSearchParams} from "next/navigation";
import {useEffect, useId, useRef, useState, Suspense} from "react";
import {createPortal} from "react-dom";
import {LogoutControl} from "./LogoutControl";
import {ToolIcon} from "./ToolIcon";

const primary = [
  {label:"Next Move", href:"/dashboard", icon:"home"},
  {label:"My Team", href:"/team", icon:"team"},
  {label:"Trade Lab", href:"/trade-lab", icon:"trade"},
  {label:"Start/Sit", href:"/team?view=lineup", icon:"lineup"},
  {label:"Waivers", href:"/waivers", icon:"waiver"},
  {label:"My Leagues", href:"/leagues", icon:"league"}
] as const;
const account = [
  {label:"Connected Fantasy Accounts", href:"/connect"},
  {label:"Account Settings", href:"/account"},
  {label:"Subscription & Billing", href:"/account#billing"},
  {label:"Help & Support", href:"/more#help"}
];

function DrawerLinks({close}:{close:()=>void}){
  const path=usePathname();const params=useSearchParams();
  return <nav aria-label="All application tools">{primary.map(item=>{
    const active=item.href.includes('?')?path==='/team'&&params.get('view')==='lineup':path===item.href&&!(item.href==='/team'&&params.get('view')==='lineup');
    return <Link key={item.href} href={item.href} onClick={close} aria-current={active?'page':undefined}><ToolIcon name={item.icon}/><span>{item.label}</span></Link>
  })}</nav>;
}

export function AppMenu({showAdmin=false}:{showAdmin?:boolean}){
  const path=usePathname();
  const [open,setOpen]=useState(false);const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);const heading=useId();const id=useId();
  const close=()=>setOpen(false);
  useEffect(()=>{
    if(!open)return;
    const element=dialog.current;const opener=trigger.current;const previous=document.body.style.overflow;
    element?.showModal();document.body.style.overflow='hidden';
    return()=>{element?.close();document.body.style.overflow=previous;opener?.focus({preventScroll:true})};
  },[open]);
  return <><button ref={trigger} type="button" className="dashboard-header-control dashboard-menu" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(true)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
    {open&&createPortal(<dialog ref={dialog} id={id} className="app-drawer" aria-labelledby={heading} onKeyDown={event=>{
        if(event.key!=='Tab')return;
        const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter(element=>element.getClientRects().length>0);
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }} onCancel={close} onClose={close} onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close()}}}>
      <header className="drawer-heading"><div><span className="eyebrow">Your playbook</span><h2 id={heading}>Navigation</h2></div><button autoFocus className="drawer-close" onClick={close} aria-label="Close navigation menu">×</button></header>
      <section className="drawer-section drawer-tools" aria-label="Fantasy Tools"><h3>Fantasy Tools</h3><Suspense fallback={<p role="status">Loading navigation…</p>}><DrawerLinks close={close}/></Suspense></section>
      <section className="drawer-section" aria-label="Account & Services"><h3>Account & Services</h3>{account.map(item=><Link key={item.href} href={item.href} onClick={close} aria-current={path===item.href?'page':undefined}>{item.label}<span aria-hidden="true">›</span></Link>)}{showAdmin&&<Link href="/admin" onClick={close}>FantasyNextMove Admin</Link>}</section>
      <div className="drawer-bottom"><h3>Legal & Session</h3><nav className="drawer-legal" aria-label="Legal & Session"><Link href="/privacy" onClick={close}>Privacy Policy</Link><Link href="/terms" onClick={close}>Terms of Service</Link></nav><LogoutControl/><p>Read-only analysis. Lineups, waivers and trades are never submitted to your provider.</p></div>
    </dialog>,document.body)}
  </>;
}
