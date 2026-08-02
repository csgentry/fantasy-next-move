import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function PrivacyPage() {
  return (
    <AppShell>
      <article className="panel legal-page">
        <span className="eyebrow">Privacy policy</span>
        <h1>FantasyNextMove Privacy Notice</h1>
        <p className="legal-updated">Last updated August 2, 2026</p>

        <h2>What FantasyNextMove stores</h2>
        <p>FantasyNextMove may store your account email, access level, connected-provider identifiers, selected leagues, league settings, teams, rosters, standings, historical records, weekly player snapshots, draft-pick ownership, product activity, billing identifiers, subscription status, refund requests, and administrative audit history.</p>

        <h2>Provider connections</h2>
        <p>Sleeper imports use Sleeper data endpoints and do not ask for your Sleeper password. Yahoo authorization happens on Yahoo. Your Yahoo password is not sent to FantasyNextMove. Yahoo access and refresh tokens are encrypted before storage and are used for read-only fantasy data requests.</p>

        <h2>Payments</h2>
        <p>Payment information is collected and processed by Stripe. FantasyNextMove stores Stripe customer, subscription, invoice, payment-status, and refund identifiers needed to operate subscriptions and customer support. FantasyNextMove does not store complete card numbers or card security codes.</p>

        <h2>Where data is kept</h2>
        <p>Account-owned application data is stored in Supabase and the service is hosted through Vercel. Authentication is maintained with secure cookies. Billing data is synchronized from Stripe to Supabase for access control, account display, auditing, reconciliation, and administrative support.</p>

        <h2>How data is used</h2>
        <p>Imported data is used to display dashboards, league history, lineup analysis, trade values, Power Rankings, recommendations, projection accuracy, and draft capital. Billing and product events are used to provide access, enforce league limits, support customers, improve the product, and understand service health.</p>

        <h2>Sharing and sale</h2>
        <p>FantasyNextMove does not sell personal information. Data is processed through the hosting, authentication, database, payment, analytics, and fantasy-provider services needed to operate the product.</p>

        <h2>Your controls</h2>
        <p>You can manage billing through Stripe&apos;s customer portal, disconnect supported fantasy providers, request an eligible first-payment refund, and delete your FantasyNextMove account after canceling active billing. Some billing, fraud, tax, security, and audit records may be retained when required.</p>

        <h2>Security and limitations</h2>
        <p>FantasyNextMove uses access controls and server-side authorization, but no online service can promise absolute security. Report suspected account or data issues promptly through the available support channel.</p>

        <div className="legal-links"><Link href="/terms">Read the Terms</Link><Link href="/pricing">View Pricing</Link><Link href="/">Return home</Link></div>
      </article>
    </AppShell>
  );
}
