"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthStatus } from "@/components/AuthStatus";

const nav = [
  ["Dashboard", "/dashboard"],
  ["My Leagues", "/leagues"],
  ["Connect League", "/connect"],
  ["Trade Lab", "/trade-lab"],
  ["Record Book", "/record-book"]
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
        <nav aria-label="Primary navigation">
          {nav.map(([label, href]) => <Link className={pathname === href ? "active" : ""} key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="sidebar-card">
          <strong>Invite-only beta</strong>
          <p>Real league connections, saved history, and dynasty picks require an approved account.</p>
          <AuthStatus />
        </div>
      </aside>
      <main className="app-content">
        {children}
        <footer className="app-footer"><span>FantasyNextMove private beta</span><span>Read-only analysis. No lineup, waiver, or trade actions are submitted.</span><span className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></span><AuthStatus compact /></footer>
      </main>
    </div>
  );
}
