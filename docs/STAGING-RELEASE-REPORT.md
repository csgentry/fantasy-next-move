# Staging release verification — 16 October 2026

**Decision: NOT READY.** No staging deployment or PR exists. Production/main remain unchanged. This report distinguishes source/fixture checks from real customer-journey verification.

## Source and publication

Repository: https://github.com/csgentry/fantasy-next-move. Branch: simplify-next-move. Parent release e391b45437f3132d8ed45b2c2dc73da569825136 preserved; cleanup commit recorded in Git. Main baseline 97d86b042d2a0e04344e28d301363ce7c8d5d34f unchanged. No force push/history rewrite. Remote branch query returned no branch. No PR URL.

Original ZIP CRC passes; SHA256 74b4dabd3a4a6c3f5d57af6df892bd60322d28d94d1f8a3dc4ea2e860376a766. Repository HEAD matched authoritative release before cleanup. This is archive integrity, not independent origin authentication.

Removed sandbox account/Checkout/subscription/invoice/Portal references from current publication docs and replaced an unnecessary personal admin email with a placeholder. Removed obsolete install/billing/package instructions that advertised retired tiers or unsafe production SQL replay. Preserved migrations, technical setup and historical release notes. Private test evidence kept outside tracked source. Explicit pattern scan covered tracked files and 387 reachable Git blobs: credential matches were empty assignments or documented placeholders after review; no credentials detected. This is a heuristic scan, not proof of absence. Earlier commits still contain nonsecret sandbox IDs; preserving history means tip sanitization does not erase them.

### Exact access diagnosis

GitHub authenticated identity: csgentry. Accessible GitHub App installations: empty list, allow-all-repositories testing false. Repository collaborator-permission endpoint returns 403 Resource not accessible by integration. Earlier branch creation returned the same error. Local Git has no authenticated credential helper/write credentials. Owner identity authentication does not establish App installation access. Cannot inspect installation permission grants because none are exposed; cannot prove whether missing selection versus missing grant is the sole cause. No evidence of branch-protection rejection.

Required owner action: in GitHub Settings → Applications → Installed GitHub Apps, configure the ChatGPT/Codex integration used by this connection to include csgentry/fantasy-next-move; approve requested Contents and Pull requests write access (and Workflows if workflow-file publication requires it), then reconnect GitHub in ChatGPT. If that app installation is absent, complete the connector's install/authorization flow for the existing repository. Do not create a repository or paste a token into chat.

Vercel identity: csgentry-5458. Existing project fantasy-next-move, prj_DUpxUxV0Rx7sDOc35WoSOL7r1O3z; owning scope team-gentry1, team_hbRFgP2cmXR11oHew6b1dZqL. Git namespace csgentry is visible with admin viewer and unrestricted namespace metadata. Explicit owning-team member/project operations return 403 Not authorized under scope team-gentry1; response reports no SAML/SSO enforcement. Unscoped project metadata works. No local Vercel CLI credentials are available. Project-level GitHub repository installation permission cannot be confirmed from namespace visibility.

Required owner action: reconnect/authorize Vercel for existing team-gentry1 and its existing project; verify the Vercel GitHub installation includes this repository under Project Settings → Git. Confirm the connected identity can deploy Preview to this project. Reconnection must actually grant scope; repeating login alone is not evidence of repair.

## Staging / production

Staging URL: NONE. Deployment ID: NONE. Preview build: BLOCKED by access. Local production build: PASS. Returned Vercel environment metadata had Production targets, no Preview credentials; safe Preview setup still required. Use isolated synthetic Supabase accounts in the existing project, sandbox Stripe keys/webhook, test-safe email and isolated GA4. Yahoo flags false. No production deployment or live charge performed.

## Tests rerun

| Check | Result |
|---|---|
| npm run lint | PASS |
| npm run typecheck | PASS |
| npm test | PASS — 27, zero failures |
| npm run build | PASS |
| node tests/http-smoke.cjs | PASS |
| git diff --check | PASS |
| Browser/mobile/WebKit screenshots | BLOCKED — not successfully captured |

HTTP results: /, /demo, /pricing 200; /dashboard and /team redirect to login with next path; account leagues API 401; cross-origin mutation 403. No fresh rendered QA of privacy/terms/login/signup or authenticated screens. Browser-engine installation previously failed; available cloud browser rejected local-site access with an explicit no-workaround security restriction. No circumvention attempted. Checked-in browser tests require a permitted staging URL/runner. No mobile accessibility/performance acceptance claimed.

## Authentication — actual customer flow

| Flow | Result |
|---|---|
| Signup / email verification | BLOCKED |
| Login / wrong password / logout | BLOCKED |
| Password reset / expired link | BLOCKED |
| Session expiry / multiple sessions | BLOCKED |
| Delete account | BLOCKED |

Public Supabase REST probe previously timed out; no actual email-confirmed synthetic browser user was created. Fixture proves free signup does not require service-role initialization. Fixtures do not verify delivery or sessions.

## Sleeper — actual authenticated flow

| Flow | Result |
|---|---|
| Connect / league discovery / team selection / save | BLOCKED |
| Next Move / My Team / connected-roster Trade Lab / League | BLOCKED |
| League switch / refresh / disconnect / reconnect / deletion | BLOCKED |

Source and fixture coverage exists for discovery, owner/team selection, malformed season, unauthenticated rejection and upstream outage. Real connected-team recommendations, roster rendering, trade verdicts and rankings are not verified. Existing five-section navigation preserved. No product redesign or expansion in this cleanup.

## Stripe — application lifecycle

| Flow | Result |
|---|---|
| App Checkout / hosted payment | BLOCKED |
| Delivered webhook / entitlement / immediate UI transition | BLOCKED |
| Portal UI / cancellation / period-end limits | BLOCKED |
| Failed payment / renewal / duplicate event / reconciliation | BLOCKED |
| Forged and expired signature unit checks | PASS |
| Live-key rejection unit check | PASS |

Prior provider-only sandbox checks created Checkout and Portal sessions, paid a synthetic API subscription invoice, then canceled the subscription. Those are not app E2E. No active QA subscription remains. Sandbox IDs omitted from public logs. Application needs test secret, webhook endpoint registration/secret and authorized browser flow. No live keys accepted or configured by this work.

## Email / analytics / monitoring

Actual verification/reset/provider/billing notices delivered: NONE VERIFIED. Sender SPF/DKIM/DMARC, links and mobile email layout: BLOCKED by sender/inbox access. No bulk email sent.

Actual GA4 received events: NONE VERIFIED. Consent, canonical-path forwarding and allowlist source controls exist; GA4 disabled until an isolated property is configured. No PII/roster transmission test at the destination has run.

Actual alert delivered: NONE VERIFIED. Health route/workflow source exists; workflow not published/active. Database reachability, provider/auth spikes, webhooks, email failures and exceptions still need deployed monitoring and tested destination. A workflow file is not delivery evidence.

## Database / security

Five security migrations already applied and preserved. Prior transaction tests passed first-free-league acceptance, second-league rejection, owner-only provider references, unrelated-user invisibility and invoker entitlement lookup; synthetic SQL users rolled back. RLS enabled on all public tables. Simultaneous independent transactions, upgrade/cancellation quota changes and full two-user API coverage of trades/settings/entitlements remain UNVERIFIED. Trigger uses per-user transaction advisory locking; design review does not count as race test.

Remaining advisor warning: leaked-password protection disabled. Auth dashboard/plan availability not verified; no supported configuration-write capability found. No claim it is resolved. Five RLS-without-policy informational findings intentionally deny browser access. Applied function-privilege warnings were resolved and tested previously.

Backups: plan-specific frequency, retention, PITR and restore availability NOT VERIFIED. Restore rehearsal NOT PERFORMED. Confirm in existing project Dashboard → Database → Backups, capture retention/restore options, reconcile baseline migrations, then rehearse only on an approved isolated target. Do not restore active production or provision a billable target without approval.

## Yahoo / business

Yahoo stays disabled. Developer-signed agreement does not verify countersignature, final activation or working production OAuth. Separate temporary/session onboarding and contract architecture review remain before either flag can be enabled. Persistence guard and disabled history endpoint remain; no restricted history storage added.

LLC approval, EIN if required, bank, Stripe production verification, legal/privacy/subscription review, support readiness and explicit live-billing authorization are unverified external gates. Vercel identity metadata shows Hobby billing; actual owning-team commercial plan needs confirmation. Official Hobby terms restrict commercial use; a suitable paid plan may require spend approval before commercial launch.

## Pricing recommendation — no changes activated

Keep $7.99 monthly as a test hypothesis. Recommend evaluating $49.99 annual first, not finalizing it before useful connected-team beta evidence. It is closer to FantasyPros PRO's observed $47.88/year reference; that product includes more established breadth, so $59.99/$69.99 require stronger differentiated value evidence. Willingness to pay is unproven.

| Annual price | Discount vs 12 × $7.99 | Illustrative net/annual payment | Approx fixed-cost break-even subscribers |
|---|---:|---:|---:|
| $39.99 current sandbox | 58.3% | $38.25 | 39 |
| $49.99 | 47.9% | $47.89 | 33 |
| $59.99 | 37.4% | $57.53 | 29 |
| $69.99 | 27.0% | $67.17 | 25 |

Illustrative fees assume 2.9% + $0.30 Payments and 0.7% Billing, not verified account rates. Break-even uses existing model assumptions: 70% annual / 30% monthly, $116 monthly fixed, $1.35 variable/support/replacement acquisition per subscriber plus 2% refunds. Excludes owner salary, tax, initial acquisition and unvalidated data licensing. Estimates are projections, not revenue. Sources: https://www.fantasypros.com/premium/plans/fp-ft/ and https://stripe.com/pricing . No production price changed.

## Repository privacy recommendation

Recommend PRIVATE for commercial source and internal operations, subject to owner approval. This does not repair existing credential authorization. GitHub integrations/development tools must be granted private repository access; Actions minutes/features can differ by plan, and workflows must be rechecked. Personal private GitHub repositories can use Vercel; Hobby has restrictions for private organization repositories and requires recognized owner commit authorship. Current local commits use Codex identity: verify legitimate author-to-Vercel association before relying on Git-triggered deployment; do not falsify authorship. Existing public forks/copies cannot be recalled by changing visibility. No visibility change performed.

Sources: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility ; https://vercel.com/docs/git ; https://vercel.com/docs/deployments/troubleshoot-project-collaboration ; https://vercel.com/docs/plans/hobby .

## Owner actions required now

1. Repair existing GitHub App repository scope/write grants and Vercel owning-team/project authorization as above.
2. Securely configure Preview-only Stripe test credentials/webhook and test-safe privileged Supabase/email settings; provide authorized test inbox and isolated GA4/alert destination. Do not paste secrets into chat.
3. Verify backup/plan controls in Supabase dashboard. Decide repository privacy separately; no visibility change is required to continue safe staging work.

After access: publish branch/PR without merging, deploy Preview, run actual customer journey and screenshots, fix defects, then request production merge approval. Until that evidence exists the decision remains NOT READY.
