# FantasyNextMove

Know what to do next with your fantasy team.

Existing repository: https://github.com/csgentry/fantasy-next-move

The simplified app has five sections: Next Move, My Team, Trade Lab, League, Account. Sleeper is the supported connection path. Yahoo remains disabled pending final activation and compliant temporary-processing review. Record Book, Yahoo historical imports and separate paid tiers are retired.

## Local development

Use Node.js 24. Run `npm ci`, copy `.env.example` to `.env.local`, configure your authorized environment, then run `npm run dev`. Never commit filled environment files. Public Supabase configuration supports normal signup; service-role credentials are server-only and required only for privileged account/billing operations.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `node tests/http-smoke.cjs`. Browser QA: `npx playwright install --with-deps chromium webkit`, then `npx playwright test` on an authorized runner. Fixtures and HTTP checks do not establish authenticated end-to-end success.

## Release

Use the existing `fantasy-next-move` Vercel project. Publish `simplify-next-move` as Preview, configure test-safe integration settings using `.env.staging.example`, verify staging, and open a PR into main. Do not merge without owner approval. Do not enable live billing or Yahoo.

Applied security migrations are in `supabase/migrations`. Do not replay legacy baseline SQL over the existing database. Reconcile the historical baseline before testing a clean restoration.

See [staging release report](docs/STAGING-RELEASE-REPORT.md), [architecture](docs/ARCHITECTURE.md), [operations](docs/OPERATIONS.md), and [launch checklist](docs/LAUNCH-CHECKLIST.md). Historical changelog/release notes describe prior versions, not current setup instructions.
