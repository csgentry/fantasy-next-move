"use client";

import Link from "next/link";
import {useId,useRef,useState} from "react";
import {useAnalysisSession} from "./PlayerAnalysisSession";
import {useYahooSession} from "./YahooSession";
import {ProviderAvatar} from "./ProviderAvatar";
import {LogoutControl} from "./LogoutControl";
import {customerSleeperAvatar} from "@/lib/home-imagery";

// Uses existing account-scoped memory. Opening this menu never fetches data.
export function ProfileMenu({avatarUrl=null}:{avatarUrl?:string|null}){
 const id=useId();const popover=useRef<HTMLDivElement>(null);const [open,setOpen]=useState(false);
 const session=useAnalysisSession();const yahoo=useYahooSession();
 const selected=session.peekSelection(session.owner);
 const league=yahoo.selection?.league||selected?.league;
 const image=league?customerSleeperAvatar(league):avatarUrl;
 const close=()=>popover.current?.hidePopover();
 return <div className="app-profile">
  <button type="button" className="dashboard-header-control dashboard-account" popoverTarget={id} aria-label="Open profile menu" aria-haspopup="dialog" aria-expanded={open}>
   <ProviderAvatar kind="account" name="Your profile" url={image}/><span>Account</span>
  </button>
  <div ref={popover} id={id} popover="auto" role="dialog" aria-label="Account menu" className="profile-popover" onToggle={event=>setOpen(event.newState==='open')}>
   <h2>Your account</h2>
   {league&&<Link prefetch={false} href="/leagues" onClick={close}>Switch Team / League</Link>}
   <Link prefetch={false} href="/account" onClick={close}>Account Settings</Link>
   <LogoutControl/>
  </div>
 </div>;
}
