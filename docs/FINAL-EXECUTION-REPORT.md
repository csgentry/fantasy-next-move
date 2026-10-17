> Superseded for staging publication by [STAGING-RELEASE-REPORT.md](STAGING-RELEASE-REPORT.md).

# FantasyNextMove release execution — 16 October 2026

**Launch decision: Not ready.** This report supersedes earlier status notes. Substantial source and database work is complete; the new application has not been published. No replacement repository, hosting project, database project, or parallel application was created.

## Source control and deployment
Repository: https://github.com/csgentry/fantasy-next-move. Local branch: `simplify-next-move`. Recovery tag and simplification commit `c1553e5` preserved. The final answer gives the new exact commit SHA. Source is not pushed: GitHub create-branch again returned 403 “Resource not accessible by integration”; local Git has no authenticated write credentials. Do not merge unreviewed source into main.

Existing Vercel project: fantasy-next-move, project ID prj_DUpxUxV0Rx7sDOc35WoSOL7r1O3z. Read-only unscoped project/env metadata succeeds, but project/team authorization returns 403. No staging URL was produced. Production application was not redeployed. Production domain remains https://fantasynextmove.com; current behavior was not visually verified. Only database migrations and Stripe sandbox objects below changed externally.

Vercel environment metadata lists production Supabase, Yahoo, admin, cron, and site URL keys, with no Stripe/Resend/GA4 keys returned and no Preview targets. This describes returned metadata, not an exhaustive audit of every possible integration. Secret values were not recovered or committed. A public Supabase readiness probe timed out from this execution environment; no real application Auth/API E2E is claimed.

## Product and removed clutter
App navigation: Next Move, My Team, Trade Lab, League, Account. Public pages now use small marketing navigation. Homepage presents a clearly labeled fictional Upgrade RB2 decision, three steps, three capabilities and trust language, with shorter hero spacing and calmer styling.

Next Move has a primary action, ranked supporting moves, understandable confidence, meaningful links and a compact strength/weakness snapshot. Empty accounts receive a connection prompt, not an implicit fictional roster. League now provides team comparisons instead of only a saved-league library. Power rankings display rank, starter/depth context and expandable explanations rather than precision-heavy control panels. Trade Lab leads with projected starting-lineup impact and uncertainty; supporting market values and methodology are collapsed. Missing projections produce a situational verdict rather than fabricated gains.

Record Book and Yahoo history imports remain retired. Historical marketing, old paid-plan copy, feature-version labels and fantasy command-center language were removed from primary flows. Compatibility identifiers remain internally for old billing/account records. Existing Sleeper historical data was preserved. No new sports, native app, social system or calculators were added.

## Free and Pro
Free source path: one connected Sleeper league, basic team snapshot, one server-selected Next Move, fictional Trade Lab preview. Pro: complete recommendation stack, full Trade Lab, existing multiple-league entitlement limits. Database trigger serializes per-account quota checks using a transaction advisory lock. Existing complimentary access remains supported.

Proposed launch pricing is $7.99 monthly / $39.99 annually (58.3% annual discount). This is a testable recommendation, not proven willingness to pay. It is below the narrower current FantasyPros PRO reference prices retrieved in this run; FantasyNextMove must still demonstrate enough decision quality to justify payment. See financial model and competitive notes. Live billing keys remain blocked in source; this guard is not claimed deployed.

## Testing
- `npm run lint`: PASS; all seven prior defects fixed without rule suppressions. State derived from inputs or reset through keyed workspaces, rather than copied in effects.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 27 tests. Includes bounded Yahoo retries, token ownership/gate, valid/forged/expired webhook signatures, live-key rejection, missing-profile confidence, defenses, Superflex, trade lineup improvement/decline/missing data, Sleeper discovery/team selection/outage fixtures, free signup without admin key, analytics failure reporting and health probes.
- `npm run build`: PASS, optimized Next.js build.
- Local HTTP smoke: homepage/demo/pricing 200; unauthenticated dashboard/My Team redirect; league API 401; cross-origin mutation 403.
- Database transaction tests: first free league accepted, second rejected; forged provider owner rejected; unrelated identity sees zero other-user records; owned entitlement lookup still succeeds after removing definer privileges. All synthetic database users rolled back; subsequent count verified zero remain.
- Current regression suite has zero failures. A draft trade fixture initially expected a decline where its own numbers actually improved the lineup by one point; corrected the fixture to test a real decline. This was not concealed as a model defect.

## Mobile and visual QA
No successful visual device test is claimed. Earlier local engine installation failed. This run found the available cloud Chrome surface, but it refused local-site access and explicitly prohibited workarounds. No bypass was attempted. Desktop/mobile/WebKit Playwright tests and screenshot capture are now checked in, with a quality workflow for an authorized runner after the branch can be pushed. They have not run. Full authenticated visual QA still blocks staging acceptance.

## Authentication and Sleeper
Free signup no longer initializes a privileged admin client when no invite code is used. Verification return URL goes to Connect. Fixture verifies this path; real email verification, login/reset/logout/delete remain unverified. No verified welcome or reset email was delivered.

Sleeper import uses authenticated POST, protected by the origin guard, rather than mutating provider references on GET. Fixtures verify discovery, owner selection, validation, authentication rejection and safe provider-outage messaging. Team choice is explicit when no matching owner exists. Selection-save errors surface; stale league changes are not silently acknowledged. Refresh/reconnect, multiple real leagues and full user-session E2E remain unverified. Account has a server-side Sleeper disconnect/data-removal action; its real UI and deletion flow are unverified.

## Yahoo
Architecture preserved and gated. Production activation and countersignature remain externally unverified. No Yahoo payload persistence or historical imports restored. The recovered agreement copy is not evidence of Yahoo completion. Compliant temporary-session onboarding is still unfinished and must be reviewed before enabling either Yahoo flag. No live token refresh/import test occurred.

## Stripe sandbox — real provider checks
User confirmed use of the existing “New business sandbox”, [private sandbox reference], livemode=false.
- One Pro product created: prod_VSDcKN954PHZ2D.
- Monthly $7.99 test price and annual $39.99 test price created; IDs in .env.staging.example.
- Hosted subscription Checkout session created; it remains open/unpaid. No claim that the hosted Checkout UI was completed.
- Separate synthetic API subscription created active: [private sandbox reference]. Invoice [private sandbox reference] was paid for 799 USD cents using a Stripe test payment method.
- Subscription canceled; subsequent provider read verified canceled.
- Customer Portal session created; no Portal UI cancellation action was performed.
- App webhook delivery, app entitlement activation/revocation, renewal, failure recovery and reconciliation remain unverified. Provider API success is not application E2E success.
No real card data or live payments used. Synthetic Stripe customer/test artifacts retained for audit; no active QA subscription remains.

## Analytics, monitoring and email
Internal event allowlist and source instrumentation cover signup/start, provider discovery, league selection, dashboard/recommendation, Trade Lab and pricing. Account creation and billing events originate server-side. Browser event properties are discarded, arbitrary roster events excluded, and storage failures no longer claim a recorded event. Anonymous internal event writes are declined; anonymous funnel measurement requires opt-in GA4.

Optional GA4 integration is disabled by default and requires an isolated configured property plus user consent. It sends event names and canonical paths, not query strings, roster/player details, email or user ID. Disable enhanced measurement in the GA4 property before activation. Live GA4 collection has not been verified.

Health endpoint probes database REST reachability as the public role with a timeout; returns redacted status and never uses the service credential. A scheduled readiness workflow and failure-exit script are checked in, but are not active until pushed/default-branch deployment. GitHub failure notifications/alert routing are unverified. No Resend key, sender, or test inbox verified. Transactional email and exception-based alert delivery remain blocked.

## Database/security/backup
Five applied migrations now have matching source records: original trigger execution restriction, Yahoo persistence prohibition, one-free-league quota, account-owned provider references, invoker entitlement checks. RLS remains enabled. Yahoo credentials remain server-owned and encrypted, OAuth state account-bound, cross-origin mutations denied, Stripe signatures verified, and live API keys blocked by the changed source.

The privileged-function advisor warnings are resolved; owned-access functions now run as invoker and passed an account-scoped test. Remaining security warning: leaked-password protection disabled. Available API tools cannot change the Auth dashboard setting; enable/verify it where the project plan supports it. Five policy-free RLS tables intentionally deny browser access; they are informational findings.

Backup availability and restoration are NOT verified. No backup API or isolated restore target was available; restoring over the active database would be inappropriate. No replacement database project was created. Existing historical schema baseline still needs reconciliation before a clean restore/replay.

## Business and access required
Indiana formation approval, EIN if required, banking, legal review, support readiness and Stripe production authorization remain external gates. No status fabricated.

Next unblockers: reconnect GitHub with write access to the existing repository; authorize Vercel project/team access; securely supply staging Stripe test credentials/webhook secret and test-safe Supabase service configuration; enable an authorized browser runner; provide verified mail sender/test inbox and GA4 property; verify backup/restore target. No permission to spend or enable live billing is requested by this increment.
