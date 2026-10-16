# Operations and rollback

Install Node 24, run `npm ci`, `npm test`, `npm run typecheck`, `npm run build`. `node tests/http-smoke.cjs` expects no local Supabase config and validates configuration failure behavior, public pages and cross-origin denial. `npm run lint` currently exposes documented legacy defects.

Populate `.env.local` using `.env.example`; keep it untracked. Use separate Supabase staging project and Stripe test account/keys/prices. The staging project does not yet exist and must not share production write credentials. Configure the current Vercel project after access is restored. Deploy branch as Preview, validate it, then consider production. Do not set Yahoo gate flags without approval evidence and completed ephemeral integration.

Migration history warning: existing database lists only the two new hardening migrations, while old checked-in SQL was apparently installed manually. Baseline schema reconciliation is required before replaying migrations onto a clean database. New migration files use versions returned by the server.

Source rollback: checkout recovery-2026-10-16 (base SHA in execution status). Existing production deployment was not changed. Database rollback, only if required: drop constraints no_persisted_yahoo_leagues/no_persisted_yahoo_history; trigger EXECUTE grants can be restored to previous roles, but doing so restores warnings. Never roll back safe restrictions just to unblock Yahoo persistence. No data deletion occurred.

Incidents: disable Yahoo gate and relevant credential use on suspected provider compromise; stop new checkouts on billing anomalies; preserve redacted event metadata, investigate exposure, rotate affected credentials, involve owner/counsel and provider incident contacts. Contract-specific response deadlines are in the private Yahoo agreement and need an owner-approved response runbook. Never log tokens, raw provider payloads, webhook secrets, or emails in analytics. Backup restoration and alert routing remain unverified.
