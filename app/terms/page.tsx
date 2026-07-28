import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function TermsPage() {
  return (
    <AppShell>
      <article className="panel legal-page">
        <span className="eyebrow">Beta terms</span>
        <h1>Private Beta Terms</h1>
        <p className="legal-updated">Last updated July 28, 2026</p>

        <h2>Invite-only access</h2>
        <p>FantasyNextMove is an unfinished private beta. Access is limited to approved accounts using valid invite codes. Do not share your password or use another person&apos;s account.</p>

        <h2>Decision support only</h2>
        <p>Power rankings, contender scores, recommendations, player values, draft-pick projections, and trade verdicts are experimental estimates. They are not guarantees of player performance, trade fairness, league results, or financial value.</p>

        <h2>Read-only operation</h2>
        <p>The beta is designed for analysis. It does not submit lineups, waiver claims, trades, payments, or commissioner changes to connected fantasy platforms.</p>

        <h2>Acceptable use</h2>
        <p>Do not attempt to bypass beta access, access another user&apos;s data, probe credentials, overload provider APIs, scrape the service at scale, or use the app in a way that violates Yahoo, Sleeper, or league rules.</p>

        <h2>Data accuracy</h2>
        <p>Provider data can be delayed, incomplete, unavailable, or interpreted incorrectly. Review the original fantasy platform before making a decision. Report incorrect imports or calculations to the beta administrator.</p>

        <h2>Availability and changes</h2>
        <p>Features may change, reset, or become unavailable without notice during testing. Beta access may be suspended to protect users, providers, or the service.</p>

        <h2>No payments</h2>
        <p>No subscription payment is collected in the current private beta. Paid terms will be presented separately before any billing is activated.</p>

        <div className="legal-links"><Link href="/privacy">Read the Privacy Notice</Link><Link href="/">Return home</Link></div>
      </article>
    </AppShell>
  );
}
