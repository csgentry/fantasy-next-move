# FantasyNextMove production launch checklist

Release 1.3D is a launch candidate. Complete every launch gate before enabling public live payments.

## Deployment and database

- Push the complete 1.3D project and confirm Vercel succeeds.
- Run `COPY_PASTE_SQL_1.3D.sql` in the existing Supabase project.
- Confirm existing beta users receive complimentary All Access.
- Confirm Row Level Security prevents one user from reading another user's leagues, billing summary, snapshots, and history.
- Confirm both daily cron routes authenticate with `CRON_SECRET`.

## Stripe Test mode

- Create all four recurring prices and two one-time founding coupons.
- Configure Customer Portal.
- Configure and verify the production-domain webhook in Test mode.
- Test Trade Lab monthly and annual purchases.
- Test All Access monthly and annual purchases.
- Confirm founding discounts apply only to eligible annual first invoices.
- Confirm duplicate webhooks do not duplicate records.
- Confirm plan upgrades, downgrades, cancellations, and period-end access.
- Confirm past-due grace behavior and eventual access removal.
- Confirm refund request, admin approval, Stripe refund, cancellation, and entitlement removal.
- Confirm daily billing reconciliation repairs a deliberately stale Test-mode record.

## Product access

- Signed-out visitor: fictional demo and Pricing only.
- Unpaid account: Account and billing access, but no real league connection.
- Trade Lab subscriber: up to three leagues and Trade Lab only.
- All Access subscriber: up to ten leagues and all premium features.
- Complimentary beta user: All Access without a Stripe subscription.
- Administrator: Admin dashboard plus all product access.

## Trade Lab and data quality

- Validate 1QB Redraft, Superflex Dynasty, Keeper, PPR, half-PPR, and TEP leagues.
- Compare imported player names and market matches for at least 100 players.
- Confirm highly ranked rookies remain clearly above replacement-level backups.
- Confirm values change appropriately between one-quarterback and Superflex formats.
- Confirm draft-pick owners and known slots match Sleeper.
- Confirm package adjustments do not allow several weak assets to equal an elite asset automatically.
- Confirm the Tradyr attribution remains visible whenever its market signal is used.
- Confirm fallback values remain usable during a simulated market-feed outage.

## User experience

- Verify mobile Pricing, Dashboard, Trade Lab, lineup, Account, and Admin pages.
- Confirm all fantasy points show two decimals.
- Confirm ranking indexes show one decimal.
- Confirm vertical lineup slot order matches each league.
- Confirm unavailable preseason metrics are described rather than shown as fake zeros.
- Confirm Overall Power, Win Now, and Dynasty Future explanations change with the selected tab.

## Operations and compliance

- Add rate limiting to signup, login, imports, checkout creation, and event endpoints.
- Add error monitoring, uptime checks, structured logs, and alerting.
- Configure database backups and test a restore.
- Publish a support/contact method.
- Have qualified counsel review Terms, Privacy, refunds, and subscription wording.
- Confirm business entity, sales-tax registrations, filing obligations, and Stripe Tax configuration with a qualified accountant.
- Complete a controlled real purchase and real refund before public launch.

## Plan boundary verification

- Verify signed-out visitors can open `/demo` but not real paid data.
- Verify Trade Lab-only accounts cannot load the real Dashboard, Record Book, league history, or Power-data APIs.
- Verify All Access accounts can load every paid feature.
