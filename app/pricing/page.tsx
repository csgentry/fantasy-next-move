"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import type { BillingInterval } from "@/lib/billing/config";

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>("year");

  useEffect(() => {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "pricing_viewed" })
    });
  }, []);

  const tradePrice = interval === "year" ? "$29.99" : "$4.99";
  const allAccessPrice = interval === "year" ? "$59.99" : "$9.99";

  return (
    <AppShell>
      <div className="page-heading centered pricing-heading">
        <div><span className="eyebrow">Launch pricing</span><h1>Choose the tools you actually need.</h1><p>No permanent free plan for real leagues. Explore the fictional demo, then subscribe to connect and analyze your own leagues.</p></div>
      </div>

      <div className="billing-toggle" role="radiogroup" aria-label="Billing interval">
        <button className={interval === "month" ? "active" : ""} onClick={() => setInterval("month")}>Monthly</button>
        <button className={interval === "year" ? "active" : ""} onClick={() => setInterval("year")}>Annual <span>Best value</span></button>
      </div>

      <div className="pricing-grid launch-pricing">
        <article className="price-card">
          <span className="eyebrow">Focused plan</span>
          <h2>Trade Lab</h2>
          <strong>{tradePrice}<small>/{interval === "year" ? "year" : "month"}</small></strong>
          {interval === "year" && <div className="founding-offer">Founding price: $19.99 for the first year while spots remain</div>}
          <p>The complete league-aware trade calculator for managers who want better player, pick, package, and counteroffer decisions.</p>
          <ul>
            <li>Up to 3 connected leagues</li>
            <li>Redraft, keeper, and dynasty support</li>
            <li>0–10,000 player and pick values</li>
            <li>League scoring, lineup, Superflex, and TEP adjustments</li>
            <li>Win Now and Dynasty Future trade impact</li>
            <li>Package, consolidation, and roster-fit adjustments</li>
          </ul>
          <CheckoutButton plan="trade_lab" interval={interval} label={`Choose Trade Lab ${interval === "year" ? "annual" : "monthly"}`} />
        </article>

        <article className="price-card featured">
          <span className="popular">Most popular</span>
          <h2>All Access</h2>
          <strong>{allAccessPrice}<small>/{interval === "year" ? "year" : "month"}</small></strong>
          {interval === "year" && <div className="founding-offer">Founding price: $39.99 for the first year while spots remain</div>}
          <p>Your complete fantasy command center with Trade Lab, rankings, lineup intelligence, history, and personalized Next Moves.</p>
          <ul>
            <li>Up to 10 connected leagues</li>
            <li>Everything in Trade Lab</li>
            <li>Overall Power, Win Now, and Dynasty Future rankings</li>
            <li>Vertical lineup and bench analysis</li>
            <li>Personalized waiver, trade, and lineup recommendations</li>
            <li>Projection accuracy, all-play, expected wins, and Record Book</li>
          </ul>
          <CheckoutButton plan="all_access" interval={interval} label={`Choose All Access ${interval === "year" ? "annual" : "monthly"}`} />
        </article>
      </div>

      <section className="panel pricing-guarantee">
        <div><span className="eyebrow">Buy with confidence</span><h2>Seven-day money-back guarantee</h2><p>First-time subscriptions can request a full refund within seven days of the first successful payment. Renewal invoices are not included.</p></div>
        <div><strong>Secure Stripe Checkout</strong><p>FantasyNextMove never stores your card number. Billing, receipts, invoices, payment updates, and cancellation are handled through Stripe.</p></div>
      </section>

      <div className="pricing-demo-link">Not ready to subscribe? <Link href="/demo">Explore the fictional demo.</Link></div>
    </AppShell>
  );
}
