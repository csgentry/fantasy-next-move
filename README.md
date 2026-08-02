# FantasyNextMove

FantasyNextMove is a league-aware fantasy-football decision platform built with the Next.js App Router, Supabase, live Sleeper imports, Stripe Billing, and an optional permitted market-value feed.

## Release 1.3D

- Public fictional demo without free real-league analysis
- Trade Lab and All Access monthly and annual subscriptions
- Secure Stripe-hosted Checkout and Customer Portal
- Verified, idempotent Stripe webhooks
- Supabase subscription entitlements and connected-league limits
- Founding-member reservations and sequential tracking for the first 250 annual customers
- Seven-day first-payment refund-request workflow
- Admin revenue, customer, access, refund, and product-event tracking
- League-aware Trade Lab 2.0 on a 0–10,000 scale
- Locked imported Redraft, Keeper, or Dynasty context
- Multiple saved-league selection
- Player and pick ranges, tiers, confidence, ranks, projections, and package adjustments
- Permitted Tradyr composite market signal with visible attribution and independent fallback
- Vertical lineup presentation and two-decimal fantasy points
- Overall Power, Win Now, and Dynasty Future explanations
- Preseason-aware dashboard metrics
- Sleeper weekly projection, actual-stat, scoring, snapshot, and recommendation intelligence
- Record Book and My Leagues
- Yahoo shown as Coming Soon until API approval is complete

## Installation

Existing deployment: follow `INSTALL_1.3D.md`.

New local project:

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Database

Existing 1.3C deployments must run:

```text
COPY_PASTE_SQL_1.3D.sql
```

New projects can run the complete `supabase/schema.sql`.

## Billing boundary

Stripe is the financial source of truth. Supabase stores synchronized subscription records and application entitlements. Reaching a Checkout success page never grants access by itself; the verified Stripe webhook does.

Keep Stripe in Test mode until purchases, webhooks, portal changes, cancellations, failed payments, refunds, and reconciliation have all passed.

## Security boundary

- Real league and billing APIs are protected server-side.
- Supabase Row Level Security limits account-owned data.
- Payment and webhook secrets remain server-only.
- Stripe event IDs are unique to prevent duplicate processing.
- The Customer Portal is created only for an authenticated user linked to the Stripe customer.
- Sleeper and Yahoo connections remain read-only.
- FantasyNextMove does not submit lineups, waiver claims, trades, or commissioner actions.

## Trade Lab boundary

Trade Lab combines an independent league-specific model with a permitted composite market signal when available. It does not scrape or reproduce proprietary competitor rankings. See `TRADE_LAB_2_METHOD.md`.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

See `VALIDATION_REPORT.md` and `PRODUCTION_CHECKLIST.md` before live payments.
