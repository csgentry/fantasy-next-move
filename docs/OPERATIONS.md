# Release operations

Use the existing GitHub repository and Vercel project. Never create replacement infrastructure to bypass access problems. Current public recovery is tracked in HOSTING-CUTOVER.md and PRODUCTION-RELEASE.md.

## Develop → Test → Verify → Release → Confirm

1. Develop one coherent change on the existing development workflow. Use one normal multi-file Git commit/push per release batch. Do not publish files individually through the web editor. Preserve unreleased work and use smaller subsequent PRs after the initial consolidation.
2. Exact-source CI runs lint, TypeScript, regressions, build, HTTP smoke, `scripts/verify-production-release.cjs`, and Playwright. The production safety script starts the built app with VERCEL_ENV=production, verifies public/private boundaries and requires all production billing entry points to return 503. Secrets must remain outside public browser assets.
3. Verify the exact deployed Preview commit through `/api/release` before running browser acceptance. `scripts/verify-preview-commit.cjs` refuses a stale alias, absent authorization, wrong host, or wrong environment. A green test of an older Preview cannot qualify the release. Keep Preview protection enabled and credentials origin-scoped.
4. Review the release diff, incomplete-feature gates, production environment compatibility, manual customer evidence and rollback deployment. Require successful Release quality checks on the exact release SHA and approval under the owner's existing release boundaries. No automatic publication of unreviewed code. Main remains unchanged until the recovery release is approved.
5. Stage a build using production configuration without assigning production domains (`vercel deploy --prod --skip-domain`, or its equivalent in the existing Vercel project). Test that production-configured build, including `/api/release`, auth boundaries, public rendering and billing shutdown. A Preview build must not be promoted as proof of a production-configured build.
6. After required authorization, promote that tested production deployment. Verify the public canonical hostname, mobile/desktop navigation, private-route denial, auth callbacks and absence of live checkout. Record release SHA, deployment ID, URL, result and rollback target. A local/Preview pass is not a completed production release.
7. Keep a known-good deployment available for instant rollback. Vercel rollback can disable automatic domain assignment until a subsequent promotion; inspect assignment rather than assuming a new push restores it. Do not replay database migrations or remove security protections as a rollback shortcut.

## Configuration and approval boundaries

- Initial DNS/domain routing, live billing, destructive database changes, broader access and material infrastructure changes require explicit approval. Routine later verified releases within established boundaries follow this process without a new strategy discussion.
- This release hard-disables production billing in shared middleware and the Stripe transport/signature helper. Do not remove those guards or enable live keys until separately accepted and authorized. Existing sandbox merchant/products remain unchanged.
- Production Yahoo stays disabled. Provider activation is not part of public hosting recovery.
- The quality workflow is implemented, but remote CI/deployed acceptance requires a repository write-authenticated Git checkout and available Vercel deployment quota. GitHub currently displays that main is not protected. Branch-required checks/production deployment review must be configured and verified in GitHub/Vercel before claiming automatic continuous delivery is active. Do not add an unattended deployment workflow with unprotected tokens or assume a newly named GitHub Environment has required reviewers.
- Store deployment tokens in a protected CI environment if a future approved pipeline requires them. Never ask the owner to paste tokens in chat or commit environment files. Keep production credentials out of Preview.
- Use the existing Supabase project and preserve account ownership/RLS. Do not create another staging database as an incidental hosting task. A separate database would need a separately reviewed scope.

## Database and incidents

Existing migration history is incomplete relative to the historical manually installed baseline. Do not replay legacy baseline SQL or destructive setup scripts. This public release needs no database migration or customer-data deletion.

On an incident, stop the affected provider or billing path, retain redacted evidence and restore the known-good app deployment. Do not log credentials, raw Yahoo data or personal account information. Review environment rollback alongside the code rollback.
