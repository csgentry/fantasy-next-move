import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function PricingPage() {
  return (
    <AppShell>
      <div className="page-heading centered"><div><span className="eyebrow">Private beta</span><h1>No payments are being collected.</h1><p>FantasyNextMove is still validating league imports, record-book accuracy, and the decision tools before paid plans are introduced.</p></div></div>
      <div className="pricing-grid beta-pricing">
        <article className="price-card featured">
          <span className="popular">Current access</span>
          <h2>Beta</h2>
          <strong>$0<small>/month</small></strong>
          <p>Use the working beta features while the product is being tested.</p>
          <ul>
            <li>Sample league dashboard</li>
            <li>Public Sleeper league import</li>
            <li>Yahoo OAuth setup pending API approval</li>
            <li>Trade Lab and historical Record Book testing</li>
          </ul>
          <Link className="button" href="/connect">Connect a league</Link>
        </article>
      </div>
    </AppShell>
  );
}
