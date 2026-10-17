# Stripe subscription acceptance — October 17, 2026

Status: BLOCKED for complete deployed application acceptance. Stripe remains the only active development milestone. Main, production and live charges remain unchanged.

## Fixed implementation map

| Responsibility | Existing implementation | Completion criterion |
| --- | --- | --- |
| Authenticated purchase | app/api/billing/checkout/route.ts, CheckoutButton | Server selects an existing USD 799 monthly or 3999 annual price, binds the authenticated user to one Stripe customer, and opens hosted subscription Checkout. Repeated requests reuse an open session. |
| Recurring billing and retries | Stripe Billing | Stripe owns invoices, payments, retry scheduling and renewal. No application payment or renewal engine. |
| Verified asynchronous updates | app/api/stripe/webhook/route.ts, lib/billing/stripe.ts | Verify raw-body signature and sandbox mode, record event receipt, retrieve current canonical subscription, synchronize successfully before acknowledging. Duplicate processed events do not repeat work; failed events can be reclaimed by one worker. |
| One access-state writer | lib/billing/sync.ts | Map the stored Stripe customer to its application owner; accept only configured prices; update subscriptions and bounded Stripe entitlement. Preserve independent admin/beta/complimentary grants. |
| Server authorization | lib/billing/entitlements.ts and existing API guards | No client redirect, metadata value or paid badge can grant access. Expired or unbounded Stripe grants are rejected. |
| Customer management | app/api/billing/portal/route.ts, Stripe Customer Portal | Authenticated customer opens only their own hosted portal; Stripe handles cancellation and payment details. |
| Recovery after missed delivery | app/api/cron/billing-reconcile/route.ts | Authenticated reconciliation retrieves canonical subscriptions, including unpaid/paused records, using cursor pagination beyond 100 records. Failed synchronization is reported as failure. Preview-only CRON_SECRET is configured. |
| Confirmation display | app/api/billing/status/route.ts, ActivationStatus | Verify the customer's own completed sandbox Checkout Session and matching synchronized active subscription. The return page never grants access or assumes a payment occurred. |

Architecture assessment: the hosted Stripe architecture is appropriate and is retained. Custom REST serialization and HMAC validation exist; signature verification has regression coverage and replacing the transport is not needed to unblock the customer workflow. Legacy Trade Lab/founding-offer helpers are not needed for the current Pro monthly/annual offering, but are inactive unless configured; removing them is not part of this milestone. Independent entitlements remain necessary for complimentary access and future non-Stripe purchase sources.

## Entitlement transitions and acceptance criteria

| Stripe state | Application expectation |
| --- | --- |
| active / valid trialing | Bounded access through Stripe's current period end, clipped to an earlier scheduled cancel_at. Trials are not offered by the current Checkout configuration. |
| scheduled cancellation | Retain access through the scheduled end; recognize both cancel_at_period_end and absolute cancel_at. |
| paid renewal / recovery | Canonical active subscription extends bounded access to its new period end. |
| past_due | Do not invent a new grace period. Retain only an already verified, unexpired paid-through entitlement; otherwise deny paid access. Stripe owns retry scheduling. |
| incomplete / incomplete_expired / unpaid / paused / canceled | No Stripe-derived access. Independent approved access is unaffected. |
| abandoned or expired Checkout | No entitlement; an open matching session may be reused. |
| duplicate / delayed event | Acknowledge completed duplicate receipts; fetch canonical state rather than applying the old event snapshot. Failed writes must produce retryable delivery failure. |
| wrong customer / unknown price / invalid signature / live event | No unauthorized entitlement writes. Events for unrelated merchant customers are acknowledged without changing this application's users. |

Primary acceptance remains a disposable authenticated customer completing hosted Checkout, receiving server-authorized access, opening Portal, canceling, and losing only Stripe access at expiration. Repeat for annual billing, failure/recovery, renewal, abandonment and account isolation. Controlled tests do not satisfy this gate.

## Verified evidence

- Original merchant acct_1S1ZJI1F6udnV1gG is named FantasyNextMove LLC and its existing connected sandbox is acct_1S1ZJRP0oZFu1pPO. No merchant migration or product replacement.
- Existing product prod_VSDcKN954PHZ2D; monthly price_1URJBdP0oZFu1pPOYKMwTnOG is USD 799/month; annual price_1URJBpP0oZFu1pPOt29OMIr5 is USD 3999/year. Both active and livemode=false.
- Existing webhook we_1UROW4P0oZFu1pPOB0PCDrMT retained. Direct unauthenticated POST to the Preview branch webhook still returns Vercel HTTP 401 before application execution.
- Billing tables billing_customers, subscriptions, entitlements and stripe_events have RLS enabled. Read-only database checks found zero application subscriptions and zero billing QA authentication users. No customer/authentication/schema/policy rows changed in this work.
- Real Stripe-only monthly subscription sub_1URRiNP0oZFu1pPOEExQUsmW: invoice in_1URRiNP0oZFu1pPOF5HVZW2o paid USD 799; active. Hosted Portal opened and cancellation confirmed for November 17, 2026. Stripe returned absolute cancel_at=1794899222 with cancel_at_period_end=false; that real response exposed and drove the cancellation compatibility correction.
- Real Stripe-only annual subscription sub_1URRj8P0oZFu1pPOwLjCW2Ip: invoice in_1URRj8P0oZFu1pPOMLyzIKE2 paid USD 3999; active, cancellation at period end scheduled for this disposable QA record.
- Real Stripe-only initial failure: sub_1URRmhP0oZFu1pPObMfhl35z / invoice in_1URRmhP0oZFu1pPOZt1aNHaJ was incomplete/open with USD 0 paid and USD 799 due. Retried through Stripe's hosted invoice using the published sandbox Visa card; canonical subscription became active and invoice paid USD 799. No real card or real charge used.
- These three Stripe customers are explicitly labeled disposable QA, have no application user linkage, and must not be reported as successful Supabase entitlement integration.
- Test clock clock_1URRhuP0oZFu1pPOJl53gQgA holds the QA customers. The connected API exposes creation but not clock advancement, so scheduled renewals and actual time-based expiration have not been verified here.
- Local validation: lint, TypeScript, build, HTTP smoke and 61 regression tests pass. Regression scenarios cover ownership, expiration, independent grants, cancellation forms, failure/recovery state rules, duplicate/concurrent webhook claims, storage-failure retries, abandoned Checkout reuse and 101-record reconciliation. Browser coverage checks that opening the return URL cannot fabricate payment or membership activation. Final deployed CI results are reported with the final commit.

## Cause of the delay and remaining gates

The main verified blockers are configuration/access: Vercel's outer protection rejects Stripe webhook POSTs, and no authorized disposable application login/inbox is available. Earlier share-link experiments returned 401/307 and were revoked. A project-wide automation token would also affect other deployments and has not been used. The EIN documentation mismatch is unrelated to sandbox testing.

Avoidable rework also came from unverified application assumptions: payment confirmation inferred from a return URL or unrelated membership, ignored database errors, ownership inferred from metadata, custom payment-failure grace and incomplete cancellation-field handling. These are corrected at the shared synchronization/receipt and confirmation boundaries, not by creating separate payment systems. The key process correction is to freeze the hosted architecture above and unblock the primary customer acceptance workflow before calling the milestone complete.

BLOCKED: deployed Checkout-to-webhook-to-Supabase activation, application Portal routing for a disposable customer, actual entitlement expiration/recovery/renewal and cross-account customer acceptance. An authorized test inbox/login and an approved webhook-compatible Preview access arrangement are required. Automatic approval review rejected provisioning an authentication account without an authorized inbox; no bypass or owner-account purchase was performed.

An owner-reviewable access option is a temporary Deployment Protection Exception for only the simplify-next-move branch alias. That makes this Preview hostname public while application sign-in, server authorization and Stripe signature validation remain. Production would be unchanged, and the exception would be removed after acceptance testing. This security change requires action-time approval; it has not been applied.

Tax: automatic tax has not been enabled or reconfigured. Live launch still requires a deliberate tax/registration decision. No live billing or legal business fields were changed.
