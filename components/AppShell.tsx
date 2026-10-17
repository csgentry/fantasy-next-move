"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {MarketingHeader} from "@/components/MarketingHeader";
import {Brand} from "./Brand";
import {PrimaryNavigation} from "./PrimaryNavigation";
import {useYahooSession} from "./YahooSession";
import {YahooAttribution} from "./YahooAttribution";
import { ProfileMenu } from "./ProfileMenu";
import { AppMenu } from "./AppMenu";


export function AppShell({ children, showAdmin = false, tone="dark", nextMove = false, profileAvatarUrl = null }: { children: ReactNode; showAdmin?: boolean; tone?:"dark"|"light"; nextMove?: boolean; profileAvatarUrl?: string | null }) {
  const pathname = usePathname();
  const yahoo = useYahooSession();

  if (["/pricing","/privacy","/terms","/demo"].includes(pathname)) return <div className="landing"><MarketingHeader/><main className="public-content">{children}</main><footer className="landing-footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><span>Read-only decision support. No guaranteed outcomes.</span></footer></div>;
  return (
    <div className={`app-shell experience-shell shared-shell ${nextMove ? "next-move-shell" : ""} ${tone=== "light" ? "light-workspace" : ""}`}><a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <AppMenu showAdmin={showAdmin}/>
        <Brand artwork/>
        <ProfileMenu avatarUrl={profileAvatarUrl}/>
        <PrimaryNavigation/>
      </aside>
      <main className="app-content" id="main-content">
        {children}
        <footer className="app-footer" role="contentinfo" aria-label="Website information"><span>FantasyNextMove</span>{yahoo.selection && <YahooAttribution/>}<span className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/pricing">Pricing</Link><Link href="/more#help">Support</Link><Link href="/account">Account</Link></span></footer>

      </main>
    </div>
  );
}
