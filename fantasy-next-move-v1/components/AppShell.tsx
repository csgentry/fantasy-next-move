import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Connect League", "/connect"],
  ["Trade Lab", "/trade-lab"],
  ["Record Book", "/record-book"],
  ["Pricing", "/pricing"]
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">FNM</span>
          <span>FantasyNextMove</span>
        </Link>
        <nav>
          {nav.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <div className="sidebar-card">
          <strong>Sleeper + Yahoo</strong>
          <p>One normalized command center for every connected league.</p>
          <Link className="button small" href="/connect">Connect league</Link>
        </div>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  );
}
