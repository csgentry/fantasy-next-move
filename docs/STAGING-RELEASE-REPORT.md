# Staging acceptance evidence — October 16, 2026

Release decision: **NOT READY**.

Latest verified update: approved automation credential configured; actual deployed public mobile/browser suite now PASS (12/12). Run 38987515067, attempt 2, job 117263672794. Public screenshots inspected. Code commit e50a45615380726a568b104c55169ce80cd0d9b1. Authentication customer E2E and application billing remain incomplete. This is an interim acceptance report. The full new-customer and Stripe application lifecycle is not verified. PR #1 stays open and unmerged; main and production are unchanged. Yahoo and live Stripe billing remain disabled.

This report supersedes earlier release reports on current publication, Yahoo agreement completion, browser access and staging QA status. It contains no confidential agreement, provider credentials, private test identifiers or account email addresses.

## Release references

- Repository: csgentry/fantasy-next-move
- Branch: simplify-next-move
- PR: https://github.com/csgentry/fantasy-next-move/pull/1
- Preview: https://fantasy-next-move-git-simplify-next-move-team-gentry1.vercel.app/
- Main baseline: 97d86b042d2a0e04344e28d301363ce7c8d5d34f
- Original published source tree: 9ed86590e760afd4703894b546caa13ada874624, exactly matching release 4df68e47340da8fef4ea27ba48e6a68e4ca34a8e.
- QA code commits: d789d418fc77bde44090403f1a04e1383a5ab13b; 16621d8eac81d67dbb325dba51bb00c1a411b7c8; b78fbb9474d6192c2e3a5a90b5d0c8e83d590345.
- Browser evidence workflow commit: fff92ef6cc31637faac7648a038075d41e078003.
- Preview for that commit: dpl_2tw9T9DxMVQtVMUnV7y9u3dNZT9D, Ready. Later documentation commits may redeploy without changing application behavior.

## Defects fixed

1. Sleeper player analysis required a privileged admin key and failed in Preview. When that key is absent, optional snapshot persistence now uses the authenticated RLS client. A storage denial does not prevent current player analysis. Real Preview retesting restored profiles, projections, recommendations and Trade Lab player names. Existing admin-backed scheduled behavior is preserved when configured.
2. A missing starter projection could be treated as zero in lineup advice. Missing values are now excluded from replacement comparisons. A regression verifies that missing data cannot create a fabricated lineup gain.
3. Tied positional signals could name the same position as both strongest and weakest. The explanation now says there is no clear distinction.
4. Removed retired founding-price terms and historical-feature marketing from legal copy. Corrected stale Yahoo approval/agreement wording while keeping activation disabled.
5. Expanded public browser QA to Privacy, Terms and password recovery, added an actual Preview target and retained screenshot/trace artifacts on every result. This revealed protected-deployment authentication as a genuine test blocker, not an application UI failure.

## Public routes and navigation

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| Homepage / | PASS | Actual deployed DOM and desktop screenshot; central promise, fictional Upgrade RB2 label, three steps, three capabilities, minimal public navigation. |
| Pricing /pricing | PASS | Actual monthly/annual controls and test-only disclosures render. Monthly Checkout fails on missing staging price configuration, below. |
| Signup /signup | PASS | Actual form renders with labeled email/password/confirmation fields. This does not verify submission or email. |
| Login /login | PASS | Actual form renders. Owner subsequently signed in manually. |
| Privacy /privacy | PASS | Actual deployed document and footer links inspected; stale copy corrected in source. Professional review remains outstanding. |
| Terms /terms | PASS | Actual deployed document and navigation inspected; retired founding terms removed. |
| How It Works /#how-it-works | PASS | Existing homepage anchor, not a separate route. Local browser assertion verifies navigation. |
| Demo /demo | PASS | Actual deployed multi-engine public suite and screenshot overview inspected. |
| Forgot password /forgot-password | PASS | Actual deployed multi-engine render tests passed; email submission unverified. |
| Contact / About | NOT TESTED | No retained public navigation links to these routes were observed. No route was invented. |
| Obsolete primary navigation | PASS | Authenticated navigation remains Next Move, My Team, Trade Lab, League, Account. No Record Book or standalone calculator exposed. |

## Mobile and visual QA

| Target | Status | What actually ran |
| --- | --- | --- |
| Desktop Chrome cloud browser | PASS | Authenticated dashboard, roster, trade form, league and account inspected by DOM; dashboard screenshot manually viewed. No major desktop overflow observed. |
| iPhone 13-sized Chromium | PASS | Actual deployed public suite passed; eight route screenshots captured and overview visually inspected. Authenticated mobile flows remain unverified. |
| Pixel 7-sized Chrome | PASS | Actual deployed public suite passed; eight screenshots captured and overview visually inspected. |
| iPhone-sized WebKit | PASS | Actual deployed public suite passed; eight screenshots captured and overview visually inspected. |
| Public deployed four-project suite | PASS | 12/12 passed on authenticated rerun: page checks, homepage action and unauthenticated protection control in each project. Original missing-auth failures remain in earlier run history. |
| Authenticated mobile screens | NOT TESTED | Requires accepted test-runner access and a disposable test identity. |

Run https://github.com/csgentry/fantasy-next-move/actions/runs/38985761000 has downloadable preview-browser-evidence. Artifact SHA256 e932e0ecc0ecbdf148bda731607c4fe2525020a9e3440c36407fd2745facfd29 was verified after download. Traces/error contexts show Vercel login. That original failed artifact is not evidence of mobile application rendering. The successful rerun artifact below supersedes this blocker. Preview protection was not disabled. No CLI Vercel token or development OIDC token is available in this runtime.

## Authentication

| Check | Status | Evidence / next requirement |
| --- | --- | --- |
| Signed-in application state | PASS | Owner completed sign-in; authenticated Account and saved league rendered. |
| New synthetic signup | BLOCKED | Current session is an existing owner account, created before this test, with complimentary Pro. A disposable account is required. |
| Verification email / callback | NOT TESTED | No test verification email received or inspected. |
| Login form | PASS | Actual deployed form render; owner-assisted existing sign-in observed. |
| Logout / wrong password | NOT TESTED | Existing session retained to finish read-only QA. |
| Reset request / reset email / password update | BLOCKED | Authorized disposable inbox and secure user interaction required. |
| Session persistence on refresh | PASS | Authenticated account and selected league survive route navigation and page reload. Expiration/multiple-session behavior unverified. |
| Account deletion | NOT TESTED | Existing owner account was not deleted. Requires disposable identity and confirmation at deletion time. |

## Real Sleeper and product acceptance

| Check | Status | Evidence / limitation |
| --- | --- | --- |
| Username discovery / league discovery | PASS | Actual owner-provided account username returned the expected saved 12-team league. |
| Automatic owner/team selection | PASS | UI explicitly showed Your team found; owner team selected. |
| Manual team selection | NOT TESTED | Automatic identification succeeded; manual team picker renders. |
| Saved connection / reload | PASS | Existing saved league and selected team render after refresh. |
| Provider refresh | PASS | Actual Find Sleeper leagues completed; current roster/projection signals subsequently rendered. |
| Multiple leagues / switching | NOT TESTED | Only one league returned for this username/season. |
| Disconnect / data removal / reconnect | NOT TESTED | Existing owner account retained; no destructive cleanup attempted. |
| Real provider outage | NOT TESTED | Safe-error regression passed; no live outage deliberately caused. |
| Next Move | PASS | Real connected roster produced named-player advice with reasons, confidence, team snapshot and working My Team/Trade Lab links. After missing-projection safeguard, primary move was a conditional suggestion to test the market on a rostered WR after an outlier prior week. No guaranteed trade return claimed. |
| My Team | PASS | Real roster rendered names, positions, 9 starters and bench, imported slot order and statuses. Projection gaps displayed as em dashes. Cross-league stale-state and mobile rendering remain unverified. |
| League | PASS | 12 teams, owner marker, starter/depth comparison, positional ranks and explanatory text rendered. Owner team ranked first with strongest RB and weakest WR, consistent with the displayed positional comparison. These are estimates, not externally validated outcomes. |

## Actual hypothetical trade scenarios

No provider trade was submitted. All are UI-only hypothetical comparisons using league players.

| Scenario | Status | Returned output |
| --- | --- | --- |
| Bench RB for receiving TE depth | PASS | Fair / Situational; 0.0 projected lineup change. Large generic-value difference did not force a favorable starting-lineup verdict. |
| Starting elite WR for low-projected WR | PASS | Poor Fit; -11.5 projected lineup points. |
| Bench RB for receiving WR depth | PASS | Fair / Situational; 0.0 projected lineup change. |
| Bench RB for higher-projected QB | PASS | Strong Improvement; +5.1 projected lineup points; moderate confidence. |
| Two bench players for QB + WR | PASS | Strong Improvement; +5.9 projected lineup points; moderate confidence. |
| Genuinely missing live projection | NOT TESTED | Regression confirms missing coverage suppresses strong verdicts and numeric gains; no live missing-data trade scenario verified. |
| Superflex | NOT TESTED | Connected league is not Superflex. Eligibility regression passed, not live E2E. |

## Free plan

| Check | Status | Evidence / limitation |
| --- | --- | --- |
| First/second league using actual free account | BLOCKED | Owner has complimentary Pro; cannot validate free gating with this identity. |
| Limit explanation / direct API bypass / concurrency | NOT TESTED | Previous rolled-back database quota tests are not live free-account/API E2E. |
| Database quota / ownership logic | PASS | Prior isolated rollback verification; migrations retained. Concurrent application attempts still unverified. |
| Complimentary Pro | PASS | Actual Account shows complimentary beta access and unlocked Pro/Trade Lab without a Stripe subscription. |
| Upgrade / cancellation changing quota | BLOCKED | Application billing is not configured. |

## Stripe application lifecycle

| Check | Status | Evidence / next requirement |
| --- | --- | --- |
| Pricing interval selection | PASS | Actual monthly and annual display controls work. |
| Monthly Checkout session | BLOCKED | Both existing sandbox price IDs are now saved to simplify-next-move Preview only. Sandbox secret key, webhook signing configuration and server database credential remain missing; full Checkout not verified. |
| Hosted Checkout / payment / return | BLOCKED | Requires sandbox price IDs, secret key and server billing configuration in branch Preview. |
| Webhook delivery / subscription record / entitlement activation / Pro UI / persistence | BLOCKED | No application Checkout completed. Existing complimentary Pro is not payment verification. |
| Signature / forged / expired payloads | PASS | Regression cryptographic checks; not a live deployed webhook E2E claim. |
| Portal / cancellation / cancellation webhook | BLOCKED | No application-linked test subscription created. |
| Period-end access / downgrade / failed payment / renewal | BLOCKED | Sandbox lifecycle and timing not exercised in the app. |
| Duplicate webhook / reconciliation | NOT TESTED | No deployed lifecycle event sequence tested. |
| Annual Checkout / canceled Checkout | NOT TESTED | Monthly initialization must work first. |

Do not add live keys or enable live billing. Sandbox provider API activity from an earlier run does not satisfy these application gates. Private billing identifiers must never be added to public documentation.

## Email, analytics, monitoring and recovery

| Area | Status | Actual evidence |
| --- | --- | --- |
| Verification/reset/account/provider/billing emails | NOT TESTED | No message actually received or opened in this run. No delivery claim. |
| Sender/SPF/DKIM/DMARC/mobile email formatting | NOT TESTED | Needs authorized test inbox and sender configuration inspection. |
| GA4 receipt: all funnel events | BLOCKED | Preview GA4 explicitly disabled; no staging measurement property/events received. |
| Analytics privacy | PASS | Source allowlist tests exclude roster data, raw identifiers and client-side billing completion. Real event forwarding and consent receipt still unverified. |
| Monitor execution / safe failure / human alert delivery | NOT TESTED | Workflow alone is not verified monitoring. No human destination tested. Preview health URL was blocked by this cloud browser client; this is not evidence of service downtime. |
| Database backup frequency / retention / PITR / restore | BLOCKED | Supabase connector reports project healthy but not plan/backup details; dashboard requires sign-in. No restore attempted or performed. |

## Security and database

| Check | Status | Evidence / limitation |
| --- | --- | --- |
| Public-table RLS enabled | PASS | Fresh database aggregate: 17 public tables, all 17 RLS enabled. |
| Five security migrations | PASS | Fresh migration-history query confirms all five October 16 versions remain applied. |
| Fresh security advisor | PASS | No high-severity findings reported; five default-deny no-policy informational findings and one warning remain. |
| Leaked-password protection | BLOCKED | Advisor still reports disabled; existing plan/support and safe dashboard change not verified. |
| Two-user API isolation across all private state | BLOCKED | Requires two disposable authenticated accounts; not proven by an owner session or RLS-enabled count. |
| Authorization / same-origin / OAuth / webhook controls | PASS | Existing regression/source verification retained; production OAuth and actual deployed webhook lifecycle not exercised. |
| Tracked-source secret scan | PASS | Heuristic credential/private-key patterns scanned 163 tracked files, no matches. This is not proof against every possible secret format. |
| Account deletion remnants / revoked session tokens | NOT TESTED | No disposable account deletion performed. |
| Browser-side secret exposure / sensitive logs | NOT TESTED | Source boundaries reviewed; exhaustive deployed bundle/log examination not completed. |

## Yahoo — corrected authoritative status

Agreement: **COMPLETED / FULLY EXECUTED**, confirmed by owner evidence. Countersignature is not a blocker. The executed agreement remains private and outside source control.

Yahoo remains disabled in Preview and production. Remaining tasks: verify actual API activation and credentials; production OAuth; transient nonpersistent league/roster/matchup processing; token refresh/revocation; rate limits; attribution/branding; verify no payload persistence. No broad Yahoo implementation was started in this run.

## Remaining gates and owner participation

Technical: disposable-account signup/reset/free quota/multi-user tests; secure sandbox billing configuration and full lifecycle; authenticated mobile QA; analytics receipt; email/monitor delivery; backup and restore evidence.

External/business: LLC/EIN/bank/Stripe production verification remain unverified; no live billing authorization.

Legal/compliance: professional review of public legal drafts and retention/deletion practices; Yahoo transient architecture review before future activation. Executed agreement completion is resolved.

Minimum next participation: provide an authorized test inbox/create and verify a disposable staging account; authenticate the existing Stripe sandbox and Supabase dashboards for secure billing credentials and backup/Auth settings inspection. Preview automation authorization and public mobile screenshots are resolved. Configure sandbox credentials only in secure service settings, never chat or public source. No production merge is requested.


## Approved protected-Preview automation — verified update

One existing-project Vercel automation bypass credential was created under explicit owner authorization and saved as the encrypted GitHub repository Actions secret FNM_PREVIEW_AUTOMATION_SECRET. No raw value is in this report, source, screenshots or URLs. It was not saved to a scratch file. Vercel automatically designates its first bypass as a server-side system variable; the application does not reference it or expose it through NEXT_PUBLIC variables. Production was not deployed.

The credential is project-wide in Vercel. CI enforces use only on push events for csgentry/fantasy-next-move at refs/heads/simplify-next-move. Pull-request runs do not receive it. The browser route supplies the documented x-vercel-protection-bypass header only to the exact authorized Preview origin, and rejects other origins. Tracing is off whenever the secret is present.

Run https://github.com/csgentry/fantasy-next-move/actions/runs/38987515067 (attempt 2) completed successfully. Deployed step: 12 passed in 22.5 seconds, including four fresh contexts without the credential that reached Vercel login. Authentication therefore remains enforced for unauthenticated visitors.

Successful artifact digest: f90f069f5d85f13cf508dcd0c5dccfbc14f90fbc331724f0747e9b3e27645aa8, verified after UI download. It contains 32 public page PNGs and no trace archives. iPhone Chromium, Pixel 7 Chrome, desktop Chrome and iPhone WebKit overviews were manually inspected for hierarchy, forms, readability and overflow; no material defect was observed. This is public visual QA, not authenticated mobile acceptance.

The two active existing FantasyNextMove Pro sandbox prices are USD 7.99/month and USD 39.99/year, livemode false. Their IDs were saved as STRIPE_PRICE_ALL_ACCESS_MONTHLY and STRIPE_PRICE_ALL_ACCESS_ANNUAL in branch-only Preview configuration. No live or Production variables changed. Existing Stripe endpoints contain no FantasyNextMove endpoint; an unrelated project endpoint was left untouched. The sandbox key dashboard requires authentication.

### Revocation / rotation gate

Official Vercel documentation states the secret works for all project deployments until revoked: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation . It does not automatically expire.

After staging acceptance, before merging or closing this release: stop the deployed Preview automation job, open existing Vercel project Settings > Deployment Protection > Protection Bypass for Automation, identify the note FNM simplify-next-move Preview QA, and revoke that single bypass through its menu. Delete FNM_PREVIEW_AUTOMATION_SECRET from existing GitHub repository Settings > Secrets and variables > Actions. Verify the old header no longer grants access, and that unauthenticated protection remains enabled. If tests must continue, rotate through authorized encrypted storage and rerun both positive and negative controls. This cleanup remains pending because staging is not yet accepted. No automatic future revocation is claimed.
