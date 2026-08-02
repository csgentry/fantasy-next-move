# FantasyNextMove 1.3D — Launch Candidate

Release 1.3D turns the working beta into a launch-oriented product with a league-aware Trade Lab, clearer lineup and ranking presentation, and complete test-mode subscription infrastructure.

## Product changes

- Fantasy point projections, actual scores, gains, and team point totals display two decimal places.
- Power Ranking indexes display one decimal place.
- The Roster Room is replaced by a vertical lineup separated into starters, bench, taxi squad, and injured reserve.
- Overall, Contender, and Dynasty are renamed Overall Power, Win Now, and Dynasty Future, with a visible explanation beneath the tabs.
- Preseason dashboards no longer feature meaningless 0–0 metrics as their primary cards.
- Personalized recommendations compare positional strength against the rest of the league before calling a position a weakness.

## Trade Lab 2.0

- A connected league locks the calculator to Redraft, Keeper, or Dynasty automatically.
- Multiple saved leagues can be selected directly inside Trade Lab.
- Manual format choices exist only in the fictional demo.
- Values use a 0–10,000 scale with ranges, confidence, tiers, overall rank, and positional rank.
- The model applies Superflex, team-count, tight-end-premium, scoring, age, projection, rookie, roster-fit, and package adjustments.
- A permitted Tradyr composite signal is used when available and is visibly attributed. The internal model remains available as a fallback.
- The app does not scrape KeepTradeCut, FantasyCalc, FantasyPros, or other proprietary calculators.

## Billing and access

- Trade Lab: $4.99 monthly or $29.99 annually.
- All Access: $9.99 monthly or $59.99 annually.
- Founding annual prices: $19.99 Trade Lab and $39.99 All Access for the first year, limited to 250 members.
- Stripe Checkout, Customer Portal, signed webhooks, duplicate-event protection, billing reconciliation, and refund administration are included.
- Supabase entitlements enforce Trade Lab and All Access on server pages and APIs.
- Existing approved beta testers receive complimentary All Access after the migration runs.

## Important launch boundary

Stripe must remain in test mode until the complete purchase, webhook, entitlement, portal, cancellation, and refund cycle has been tested. Legal wording and sales-tax obligations still need qualified professional review before public live payments.

- Added a separate fictional `/demo` page while real Dashboard, history, and Power-data routes require All Access.
