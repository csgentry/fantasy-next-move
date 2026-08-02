# Launch tracking map

## Stripe is authoritative for money

Stripe owns card collection, successful payments, invoices, recurring billing, payment failures, cancellation, and refunds.

## Supabase is authoritative for product access

- `billing_customers`: user-to-Stripe mapping
- `subscriptions`: synchronized subscription history
- `entitlements`: current Trade Lab or All Access permission
- `founding_members`: permanent founding badge and sequential number
- `founding_reservations`: temporary checkout reservation for the first 250 spots
- `refund_requests`: seven-day guarantee workflow
- `stripe_events`: idempotent webhook receipt and processing status
- `billing_audit_log`: access and billing change history
- `product_events`: pricing, checkout, league, and feature usage

## FantasyNextMove Admin

Admin shows registered users, active subscriptions, normalized MRR and ARR, founding count, connected leagues, recent product events, entitlements, complimentary access, and refund requests.

## Vercel jobs

- Daily player-intelligence sync
- Daily Stripe-to-Supabase subscription reconciliation

Both cron routes require `CRON_SECRET`.
