"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {MarketingHeader} from "@/components/MarketingHeader";
import {Brand} from "./Brand";
import {ToolIcon} from "./ToolIcon";
import {useYahooSession} from "./YahooSession";
import {YahooAttribution} from "./YahooAttribution";
import { AuthStatus } from "@/components/AuthStatus";

const nav = [
  ["Next Move", "/dashboard"],
  ["My Team", "/team"],
  ["Trade Lab", "/trade-lab"],
  ["League", "/leagues"],
  ["More", "/more"]
];

export function AppShell({ children, showAdmin = false, tone="dark" }: { children: ReactNode; showAdmin?: boolean; tone?:"dark"|"light" }) {
  const pathname = usePathname();
  const yahoo = useYahooSession();
  const navigation = showAdmin ? [...nav, ["FantasyNextMove Admin", "/admin"]] : nav;

  if (["/pricing","/privacy","/terms","/demo"].includes(pathname)) return <div className="landing"><MarketingHeader/><main className="public-content">{children}</main><footer className="landing-footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><span>Read-only decision support. No guaranteed outcomes.</span></footer></div>;
  return (
    <div className={`app-shell experience-shell ${tone=== "light" ? "light-workspace" : ""}`}><a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <Brand/>
        <nav aria-label="Primary navigation">
          {navigation.map(([label, href],index) => {const active=pathname===href || (href==="/more" && ["/account","/waivers","/connect"].includes(pathname));return <Link aria-current={active?"page":undefined} className={active?"active":""} key={href} href={href}><ToolIcon name={(["home","team","trade","league","more"] as const)[index]||"more"}/><span>{label}</span></Link>})}
        </nav>
        <div className="sidebar-card">
          <strong>League-aware analysis</strong>
          <p>Understand your team. Focus on the decision that matters next.</p>
          <AuthStatus />
        </div>
      </aside>
      <main className="app-content" id="main-content">
        {children}
        <footer className="app-footer">
          <span>FantasyNextMove</span>
          {yahoo.selection && <YahooAttribution/>}
          <span>Read-only analysis. No lineup, waiver, or trade actions are submitted.</span>
          <span className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/pricing">Pricing</Link></span>
          <AuthStatus compact />
        </footer>
      </main>
    </div>
  );
}
