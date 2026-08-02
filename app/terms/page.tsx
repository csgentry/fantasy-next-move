import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function TermsPage() {
  return (
    <AppShell>
      <article className="panel legal-page">
        <span className="eyebrow">Service terms</span>
        <h1>FantasyNextMove Terms</h1>
        <p className="legal-updated">Last updated August 2, 2026</p>

        <h2>Account access</h2>
        <p>You are responsible for keeping your account credentials private and for activity performed through your account. Do not share paid access, attempt to access another user&apos;s league data, or bypass subscription controls.</p>

        <h2>Subscriptions and renewal</h2>
        <p>Paid plans renew automatically at the displayed monthly or annual price until canceled. A cancellation takes effect at the end of the current paid billing period unless a refund is approved. Current plan, renewal, cancellation, and invoice information is available through Manage Billing.</p>

        <h2>Founding pricing</h2>
        <p>A founding discount applies only to the first eligible annual invoice. The subscription renews at the normal annual price shown at checkout. A Founding Member badge does not create permanent product access or a permanent discounted renewal rate.</p>

        <h2>Seven-day money-back guarantee</h2>
        <p>A first-time subscription may request a refund within seven days of its first successful payment. The guarantee does not apply to renewals, later subscriptions, or repeated refund requests. An approved refund ends paid access. Refund eligibility and final processing remain subject to payment records and applicable law.</p>

        <h2>Decision support only</h2>
        <p>Power rankings, Win Now scores, Dynasty Future scores, recommendations, player values, draft-pick projections, and trade verdicts are estimates. They do not guarantee player performance, trade fairness, league results, or financial outcomes.</p>

        <h2>Read-only fantasy operation</h2>
        <p>FantasyNextMove analyzes connected fantasy data. It does not submit lineups, waiver claims, trades, payments to fantasy platforms, or commissioner changes.</p>

        <h2>Acceptable use</h2>
        <p>Do not probe credentials, overload provider APIs, scrape the service at scale, resell account access, reverse engineer protected data, or use FantasyNextMove in a way that violates Sleeper, Yahoo, Stripe, league, or applicable legal requirements.</p>

        <h2>Data accuracy and availability</h2>
        <p>Provider data can be delayed, incomplete, unavailable, or interpreted incorrectly. Review the original fantasy platform before making a decision. Features, values, pricing, and availability may change as the product develops.</p>

        <h2>Account deletion</h2>
        <p>Cancel an active subscription before deleting your account. Account deletion removes account-owned FantasyNextMove data but does not replace billing cancellation or erase records that must be retained for payment, fraud, tax, security, or legal purposes.</p>

        <div className="legal-links"><Link href="/privacy">Read the Privacy Notice</Link><Link href="/pricing">View Pricing</Link><Link href="/">Return home</Link></div>
      </article>
    </AppShell>
  );
}
