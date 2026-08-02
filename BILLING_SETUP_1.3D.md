# Stripe test-mode setup for FantasyNextMove 1.3D

Do not enter live Stripe keys until every test below passes.

## 1. Create products and recurring prices

Create these Stripe products in Test mode:

### FantasyNextMove Trade Lab
- $4.99 USD, recurring monthly
- $29.99 USD, recurring yearly

### FantasyNextMove All Access
- $9.99 USD, recurring monthly
- $59.99 USD, recurring yearly

Copy each `price_...` ID for Vercel.

## 2. Create first-invoice coupons

Create these coupons in Test mode:

- Trade Lab Founding: $10.00 off, duration once
- All Access Founding: $20.00 off, duration once

Copy each `coupon_...` ID. The application automatically limits founding reservations to 250 members and applies the coupon only to eligible annual checkout sessions.

## 3. Configure Customer Portal

Enable:

- Payment-method updates
- Invoice history
- Subscription cancellation at the end of the billing period
- Plan changes between the four prices after test verification

## 4. Create the webhook

Endpoint:

```text
https://fantasynextmove.com/api/stripe/webhook
```

Subscribe to:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
customer.updated
charge.refunded
```

Copy the webhook signing secret beginning with `whsec_`.

## 5. Add Vercel Production variables

```text
NEXT_PUBLIC_SITE_URL=https://fantasynextmove.com
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_TRADE_MONTHLY=
STRIPE_PRICE_TRADE_ANNUAL=
STRIPE_PRICE_ALL_ACCESS_MONTHLY=
STRIPE_PRICE_ALL_ACCESS_ANNUAL=
STRIPE_COUPON_TRADE_FOUNDING=
STRIPE_COUPON_ALL_ACCESS_FOUNDING=
STRIPE_AUTOMATIC_TAX=false
TRADYR_API_KEY=
CRON_SECRET=
```

`TRADYR_API_KEY` is optional. The market API works without a key at its lower public rate. Never expose Stripe secrets, the Supabase service role key, or `CRON_SECRET` in screenshots, GitHub, or client-side code.

Redeploy after changing environment variables.

## 6. Test the complete cycle

Use Stripe test card:

```text
4242 4242 4242 4242
```

Use any future expiration date and any three-digit CVC.

Test all four prices, the founding discount, Account membership, Customer Portal, plan change, cancellation, duplicate webhook handling, failed payment, refund request, admin approval, and access removal.

## 7. Live-mode gate

Before live mode:

- Complete a real low-cost controlled purchase.
- Confirm the webhook activates access.
- Confirm the invoice and portal.
- Cancel and verify period-end access.
- Process and verify a real refund.
- Have the Terms, Privacy Notice, refund language, and tax obligations professionally reviewed.
