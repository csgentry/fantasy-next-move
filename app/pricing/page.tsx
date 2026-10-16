"use client";
import {EventTracker} from "@/components/EventTracker";
import {useState} from "react";
import Link from "next/link";
import {AppShell} from "@/components/AppShell";
import {CheckoutButton} from "@/components/billing/CheckoutButton";
export default function PricingPage(){
 const [interval,setInterval]=useState<"month"|"year">("year");
 return <AppShell><EventTracker event="pricing_viewed"/><div className="page-heading"><div><span className="eyebrow">Prelaunch · test billing only</span><h1>One plan for your next decision.</h1><p>Proposed pricing. Paid customer launch is pending verification and approvals.</p></div></div>
 <div className="pricing-grid">
 <article className="price-card"><h2>Free</h2><strong>$0</strong><p>Connect one Sleeper league. Get your team snapshot and highest-priority Next Move. Full Trade Lab is available as a fictional preview.</p><Link className="button secondary" href="/signup">Start free</Link></article>
 <article className="price-card featured"><h2>FantasyNextMove Pro</h2><div className="billing-toggle" role="group" aria-label="Billing interval"><button aria-pressed={interval==="month"} onClick={()=>setInterval("month")}>Monthly</button><button aria-pressed={interval==="year"} onClick={()=>setInterval("year")}>Annual</button></div><strong>{interval==="year"?"$39.99/year":"$7.99/month"}</strong><ul><li>Prioritized Next Moves</li><li>Team strength and league context</li><li>Trade Lab with roster impact</li><li>Up to 10 leagues under the existing entitlement limits</li></ul><p>Sleeper integration is under verification. Yahoo is awaiting activation and contract review. Subscriptions renew until canceled; manage cancellation through your account.</p><CheckoutButton plan="all_access" interval={interval} label="Test Pro checkout" /></article>
 </div><p>Live payments are not enabled. Yahoo support is pending activation.</p></AppShell>;
}
