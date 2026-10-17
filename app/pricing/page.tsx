import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function PricingPage() {
  return <AppShell>
    <div className="page-heading"><div><span className="eyebrow">FantasyNextMove Pro</span><h1>One plan. Two ways to subscribe.</h1><p>Pro subscriptions are not available yet. These are our planned launch prices; no payment is collected.</p></div></div>
    <div className="pricing-grid">
      <article className="price-card"><h2>Pro Monthly</h2><strong>$7.99<small>/month</small></strong><p>Monthly billing when paid subscriptions launch.</p><button className="button secondary" disabled>Subscriptions coming soon</button></article>
      <article className="price-card featured"><h2>Pro Annual</h2><strong>$39.99<small>/year</small></strong><p>Annual billing when paid subscriptions launch.</p><button className="button" disabled>Subscriptions coming soon</button></article>
    </div>
    <section className="panel pricing-guarantee"><div><h2>Explore FantasyNextMove today</h2><p>Create an account to connect a supported Sleeper league and review your team. Pro tools are being tested before paid access opens. Yahoo connections are not available yet.</p><Link className="button" href="/signup">Create your account</Link></div><div><h2>Your account stays yours</h2><p>League connections are read-only. FantasyNextMove does not submit trades, waivers or lineup changes for you. Existing complimentary access is preserved.</p></div></section>
  </AppShell>;
}
