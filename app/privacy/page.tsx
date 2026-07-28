import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function PrivacyPage() {
  return (
    <AppShell>
      <article className="panel legal-page">
        <span className="eyebrow">Beta policy</span>
        <h1>Privacy Notice</h1>
        <p className="legal-updated">Last updated July 28, 2026</p>

        <h2>What FantasyNextMove stores</h2>
        <p>During the invite-only beta, FantasyNextMove may store your account email, beta-access status, connected-provider identifiers, selected leagues, league settings, teams, rosters, standings, historical records, and dynasty draft-pick ownership.</p>

        <h2>Provider connections</h2>
        <p>Sleeper imports use the public Sleeper API and do not ask for your Sleeper password. Yahoo authorization happens on Yahoo. Your Yahoo password is never sent to FantasyNextMove. Yahoo access and refresh tokens are encrypted before storage and are used only for read-only fantasy data requests.</p>

        <h2>Where data is kept</h2>
        <p>Account-owned beta data is stored in Supabase. Real league and history records are not persisted in browser local storage. Authentication is maintained with secure cookies, and the app removes legacy browser records created by earlier prototypes.</p>

        <h2>How data is used</h2>
        <p>Imported data is used to display dashboards, league history, roster analysis, locked trade values, and dynasty draft capital. FantasyNextMove does not submit lineup changes, waiver claims, trades, or commissioner actions.</p>

        <h2>Sharing and sale</h2>
        <p>FantasyNextMove does not sell beta-user data. Data is processed through the hosting, authentication, database, and fantasy-provider services needed to operate the app.</p>

        <h2>Your controls</h2>
        <p>You can disconnect Yahoo from the Connect League page. You can permanently delete your FantasyNextMove account and account-owned beta data from the Account page. Legacy site storage from earlier prototypes can be removed by clearing site storage, and the current beta clears those legacy records automatically.</p>

        <h2>Beta status</h2>
        <p>This notice describes the current private-beta build and may be updated before a public launch. Contact the beta administrator who invited you with privacy or deletion questions.</p>

        <div className="legal-links"><Link href="/terms">Read the Beta Terms</Link><Link href="/">Return home</Link></div>
      </article>
    </AppShell>
  );
}
