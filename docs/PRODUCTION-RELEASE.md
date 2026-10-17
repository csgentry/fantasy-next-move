# Public recovery release candidate — October 17, 2026

## Scope reviewed

Remote baseline: simplify-next-move `2f2b4ea8b342c05a1eaf27b638c3e45b577d8804`; main/production `97d86b042d2a0e04344e28d301363ce7c8d5d34f`, deployment `dpl_8Z8SnLHSoQj42HuD4dF7nMcGiYfa`. Repository and PR #1 remain the same. Candidate carries the existing reviewed staging implementation forward with explicit production shutdowns; this is not a blind promotion of billing/Yahoo.

Safe retained improvements: five-destination responsive navigation, roster-first My Team, recommendation evidence/limits, simplified Trade Lab and league comparison; authenticated league ownership, origin validation, shared server entitlements, independent complimentary grants, and restricted administrative operations. Existing Sleeper integration and account-owned data are preserved. Yahoo's nonpersistence and credential work remains in source but production activation stays blocked. Existing actual provider acceptance is dated evidence; it is not new candidate live-provider acceptance.

## Implemented recovery changes

- Only Pro Monthly $7.99 and Pro Annual $39.99 are offered as planned pricing. No legacy tier prices, founding offer, free pricing tier or test-checkout button on pricing. Disabled subscription controls state that no payment is collected.
- Homepage hardcoded rankings, fabricated positional standings and sample impact metrics removed. Existing design system/text wordmark preserved; no logo recreated or new asset invented. An isolated `/demo` remains explicitly labeled fictional, never a live customer recommendation.
- All production `/api/billing/*`, Stripe webhook and billing reconciliation requests fail closed with 503 before auth/storage work, regardless of method or configured test credentials. Stripe transport/signature validation also refuses production. This does not revoke legitimate existing application entitlements.
- Public signup/login/recovery remain existing Supabase flows. Private pages and API ownership enforcement remain in place. Yahoo production availability remains false.
- Added a public no-store deployment identity containing only commit/environment. CI now verifies the exact Preview SHA before browser tests, adds real built-application production safety checks and cancels superseded runs. No automatic production deployment was enabled.
- Removed outdated operations instructions to create replacement staging infrastructure. The release/confirmation/rollback procedure is now explicit.

## Acceptance evidence and remaining gates

- PASS: local lint, TypeScript, 63 regression checks and production build on the candidate source (rerun after final source changes).
- PASS: built-app HTTP checks for public/private routes and cross-origin rejection.
- PASS: 28 production-mode HTTP checks including correct pricing, invalid auth confirmation/callback denial, private-route authentication and every billing route disabled for GET and POST; recognizable Stripe/Supabase secret patterns absent from public JS chunks. This is a scoped secret scan, not a complete security audit.
- BLOCKED: current candidate Playwright and new mobile/desktop screenshots. Official browser downloads return invalid/empty archives in this executor; the previously verified browser results belong to an older source and are not reused as acceptance.
- BLOCKED: real signup/confirmation/reset without an authorized disposable inbox. No authentication user was created, no owner subscription changed, and no approval-review restriction bypassed.
- BLOCKED: normal publication currently has no authenticated GitHub Git credential; connector writes return 403. Native batch upload did not preserve/accept directory source. Do not fall back to repeated file-by-file commits. Remote CI, exact candidate Preview and production-configured staging must still pass before traffic activation.
- External Vercel deployment quota previously rejected new deployments; no paid upgrade or production workaround authorized. Reconcile quota after source publication rather than submit repeated deployments.

## Exact approval boundary

DNS and production are unchanged. The owner should approve the exact tested candidate deployment and record-level cutover only after the remaining candidate verification gates pass. Do not claim the current public website is repaired yet.

Proposed eventual cutover: existing project only; www assigned to it and permanently redirected to the HTTPS apex with path/query retained; remove just apex A `172.66.3.26` and `162.159.143.30`; retain existing managed Vercel apex ALIAS; explicit www CNAME to the then-current Vercel project recommendation. Preserve all MX, DKIM, SPF, CAA and unrelated records and existing nameservers. See HOSTING-CUTOVER.md for IDs, current values and rollback.

Supabase Site URL and exact apex auth callback/recovery allowlist already match the canonical hostname. Confirm production NEXT_PUBLIC_SITE_URL during approved deployment because its secret value cannot be read back. Actual email flow acceptance is outstanding. Existing Vercel certificates cover apex/www, but post-cutover HTTPS still requires verification.

After approval and exact production-configured staging verification, promote that tested build and perform the scoped DNS cutover. Roll back the app to the recorded prior deployment if required. DNS rollback restores original apex A records; that restores the old login wall, so a verified maintenance build is preferable for content-only failure. Keep the old Site registration through the rollback window.
