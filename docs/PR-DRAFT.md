# Simplify FantasyNextMove around the next decision

## Result
Five app sections: Next Move, My Team, Trade Lab, League, Account. Prioritized recommendations lead; team/league evidence supports them. Trade Lab evaluates roster-specific lineup impact and withholds strong verdicts when projections are missing. Free users receive one connected Sleeper league and one server-selected recommendation; one Pro offer replaces separate advertised tiers.

## Retired
Record Book, Yahoo historical imports, historical marketing, old pricing and command-center copy remain out of launch scope. Obsolete installation/billing instructions removed; migrations and compatibility identifiers preserved.

## Security and Yahoo
Account-bound OAuth state and server-only encrypted credentials retained. Yahoo stays disabled; persistence is prohibited in API and database. Same-origin mutations, signed Stripe webhooks and test-key-only billing guards remain. Account-owned RLS, serialized free-league quota and invoker entitlement functions have five matching applied migrations. No new schema migration in this cleanup.

## Validation and release gate
Lint, typecheck, 27 regression tests, production build and local HTTP smoke pass. Real authentication, connected Sleeper, app billing lifecycle, email, analytics, monitoring and mobile/browser QA remain blocked/unverified. Review docs/STAGING-RELEASE-REPORT.md. Deploy Preview in existing Vercel project with sandbox billing and Yahoo off. **Do not merge until staging passes and owner explicitly approves.**

## Publication review
Public tip sanitized. Heuristic scan of tracked files and 387 reachable historical blobs detected no credentials after placeholder review. Noncredential sandbox object IDs remain in preserved earlier history; repository privacy recommendation requires owner decision. No force push, visibility change, live billing or production deployment authorized.
