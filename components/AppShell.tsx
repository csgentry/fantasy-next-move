"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthStatus } from "@/components/AuthStatus";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Trade Lab", "/trade-lab"],
  ["Record Book", "/record-book"],
  ["My Leagues", "/leagues"],
  ["Connect League", "/connect"],
  ["Pricing", "/pricing"]
];

export function AppShell({ children, showAdmin = false }: { children: ReactNode; showAdmin?: boolean }) {
  const pathname = usePathname();
  const navigation = showAdmin ? [...nav, ["FantasyNextMove Admin", "/admin"]] : nav;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
        <nav aria-label="Primary navigation">
          {navigation.map(([label, href]) => <Link className={pathname === href ? "active" : ""} key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="sidebar-card">
          <strong>League-aware analysis</strong>
          <p>Real league connections require Trade Lab, All Access, or complimentary beta access.</p>
          <AuthStatus />
        </div>
      </aside>
      <main className="app-content">
        {children}
        <footer className="app-footer">
          <span>FantasyNextMove</span>
          <span>Read-only analysis. No lineup, waiver, or trade actions are submitted.</span>
          <span className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/pricing">Pricing</Link></span>
          <AuthStatus compact />
        </footer>
      </main>
    </div>
  );
}
