# Production launch checklist

The application is a private-beta foundation. These services, validations, and policies are still required before public launch.

## 1. Install and verify

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Add automated checks so every GitHub change must pass type checking, linting, and a production build before deployment.

## 2. Yahoo Fantasy

- Complete Yahoo Fantasy Sports API review and obtain read access.
- Keep the exact production callback URL registered.
- Store `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REDIRECT_URI`, and `FNM_COOKIE_SECRET` only in encrypted environment settings.
- Test connect, refresh, league import, roster import, history sync, disconnect, and reconnect with real accounts.
- Add Yahoo's official Fantasy logo and required linked attribution exactly as Yahoo provides it.
- Confirm that Yahoo attribution appears anywhere Yahoo API data is displayed.

## 3. Hosted accounts and storage

The included Supabase schema is only a starting point. Before launch:

- Create a Supabase project.
- Apply `supabase/schema.sql`.
- Add authentication and server-side authorization checks.
- Replace browser-only league persistence with account-owned database records.
- Configure row-level security and test cross-account isolation.

## 4. Trade-value model

The current values are locked, consistent beta estimates—not a licensed market feed. Before calling them authoritative:

- Validate Redraft and Dynasty outputs against multiple independent benchmarks.
- Add model versioning and value timestamps.
- Add draft-pick values for Dynasty and Keeper leagues.
- Add dedicated IDP handling and deeper scoring-format adjustments.
- Add regression tests for age curves, Superflex, tight-end premium, injuries, and roster fit.
- Decide whether to license a market source or maintain a documented independent model.

## 5. Billing

No payments should be collected during private beta. Before activating subscriptions:

- Create Stripe products and prices.
- Add Checkout and Customer Portal sessions.
- Verify webhook signatures server-side.
- Store subscription state in the user profile.
- Gate paid features on verified subscription state.

## 6. Legal, privacy, and security

- Publish reviewed Privacy Policy and Terms pages.
- Explain what provider data is accessed, where tokens are stored, and how users disconnect/delete data.
- Use HTTPS-only callback URLs.
- Add rate limiting, request logging, error monitoring, backup procedures, and incident-response steps.
- Review Yahoo and Sleeper developer requirements before commercial launch.
