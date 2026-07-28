# FantasyNextMove 1.2 private-beta release

This release adds the account and dynasty foundations required for controlled beta testing.

## Included

- Invite-only Supabase accounts
- Email confirmation and password recovery
- Protected real-league routes and APIs
- Account-owned connected leagues and history
- Encrypted account-owned Yahoo tokens
- Sleeper dynasty future-pick imports
- Traded-pick ownership reconstruction
- Draft picks in locked Dynasty Trade Lab evaluations
- Privacy Notice and Private Beta Terms

## Deployment dependency

This release requires a Supabase project, the included schema, three new Vercel environment variables, authentication URL configuration, and at least one beta invite. Follow `BETA_AUTH_SETUP.md` before testing the deployment.

## Known beta limits

- Yahoo Fantasy API access is still pending.
- Yahoo future-pick support is unknown until approved data can be tested.
- Trade values remain an internal beta model.
- Full automated testing, rate limiting, monitoring, and reviewed legal documents remain outstanding.
