# Production launch checklist

The current build is an invite-only beta. Complete these items before opening public registration or collecting payments.

## 1. Deploy and verify the beta foundation

- Create the Supabase project and run `supabase/schema.sql`.
- Add the three Supabase environment variables to Vercel Production.
- Configure Supabase site and redirect URLs.
- Enable email confirmation and test confirmation and recovery emails.
- Create high-entropy, single-use invite codes.
- Run `npm run typecheck`, `npm run lint`, and `npm run build` in CI for every change.
- Test two separate accounts and confirm neither can read or alter the other account's leagues or history.
- Run `supabase/migrations/20260729_player_intelligence.sql` on existing Supabase projects.
- Add a high-entropy `CRON_SECRET` to Vercel Production and confirm the daily player-intelligence job authenticates successfully.
- Verify weekly projection and actual-stat imports against live Sleeper data and several custom scoring formats.

## 2. Authentication and abuse prevention

- Add rate limiting to login, signup, invite verification, imports, and provider OAuth routes.
- Add audit logging for invite redemption, provider connection, deletion, and authentication failures.
- Restrict the included Beta Admin dashboard with `FNM_ADMIN_EMAILS` and review administrator access before each rollout.
- Add session/device management and optional multi-factor authentication before a larger rollout.

## 3. Yahoo Fantasy

- Complete Yahoo Fantasy Sports API review and obtain read access.
- Keep the exact production callback URL registered.
- Test account-owned token restore on a second device.
- Test connect, refresh, league import, roster import, history sync, disconnect, and reconnect.
- Add Yahoo's official Fantasy logo and required linked attribution exactly as Yahoo provides it.
- Confirm attribution appears anywhere Yahoo API data is displayed.
- Determine whether Yahoo exposes future draft-pick ownership; never fabricate missing picks.

## 4. Dynasty and Trade Lab validation

- Validate projection snapshots, actual-stat snapshots, error metrics, and week rollover behavior.
- Validate optimized-lineup and player-recommendation outputs against several real leagues.
- Validate Sleeper pick ownership against several real dynasty leagues, including multi-step pick trades.
- Validate completed-draft handling so spent picks do not remain available.
- Add model versioning and value timestamps.
- Replace or independently validate the current beta player-value model before marketing it as authoritative.
- Add dedicated IDP handling and deeper scoring-format adjustments.
- Add automated regression tests for age curves, Superflex, tight-end premium, injuries, pick-year discounts, exact slots, and roster fit.

## 5. Privacy, legal, and deletion

- Have qualified counsel review the included beta Privacy Notice and Terms.
- Confirm account deletion removes auth users, league records, history, provider metadata, and encrypted provider credentials.
- Publish a support/contact method and data-retention schedule.
- Document subprocessors, incident response, backups, and breach notification procedures.

## 6. Operations

- Add error monitoring, structured logs, uptime checks, and alerting.
- Add database backups and a tested restore process.
- Add provider API timeout, retry, and rate-limit handling.
- Add a staging environment with separate Supabase and Yahoo credentials.

## 7. Billing

No payments should be collected during private beta. Before billing:

- Create Stripe products and prices.
- Add Checkout and Customer Portal sessions.
- Verify webhook signatures server-side.
- Store subscription state using trusted webhook events.
- Gate paid features on server-verified subscription status.
