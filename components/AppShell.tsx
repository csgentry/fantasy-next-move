"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Connect League", "/connect"],
  ["Trade Lab", "/trade-lab"],
  ["Record Book", "/record-book"]
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">FNM</span>
          <span>FantasyNextMove</span>
        </Link>
        <nav aria-label="Primary navigation">
          {nav.map(([label, href]) => (
            <Link className={pathname === href ? "active" : ""} key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <div className="sidebar-card">
          <strong>Private beta</strong>
          <p>League imports are read-only. Trade Lab values are locked and format-aware.</p>
          <Link className="button small" href="/connect">Connect league</Link>
        </div>
      </aside>
      <main className="app-content">
        {children}
        <footer className="app-footer">
          <span>FantasyNextMove private beta</span>
          <span>Read-only imports. Trade Lab evaluates offers but never sends them.</span>
        </footer>
      </main>
    </div>
  );
}
