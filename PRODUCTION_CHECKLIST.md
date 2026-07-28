# Production launch checklist

The application code is packaged as a complete v1 foundation. These external services still require account-specific configuration before public launch.

## 1. Install and verify

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

## 2. Yahoo Fantasy

- Create a Yahoo Developer Network application.
- Enable Fantasy Sports read access.
- Add the exact callback URL used by the deployment.
- Set `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REDIRECT_URI`, and `FNM_COOKIE_SECRET`.
- Test connect, token refresh, league import, roster import, history sync, disconnect, and reconnect with a real Yahoo account.

## 3. Hosted accounts and storage

The included Supabase schema is a starting point. Before launch:

- Create a Supabase project.
- Apply `supabase/schema.sql`.
- Add authentication and server-side authorization checks.
- Replace browser-only league persistence with account-owned database records.
- Configure row-level security and test cross-account isolation.

## 4. Billing

Before collecting subscriptions:

- Create Stripe products and prices.
- Add Checkout and Customer Portal sessions.
- Verify webhook signatures server-side.
- Store subscription state in the user profile.
- Gate Pro and Commissioner features on verified subscription state.

## 5. Player values

The Trade Lab's included values are transparent starter estimates, not a licensed market feed. Before marketing the values as authoritative:

- License a player-value source or maintain an independent ranking model.
- Add superflex, tight-end premium, dynasty, keeper, and IDP scoring context.
- Add pick values and multi-team trade support.
- Record value timestamps and model versions.

## 6. Production security

- Use HTTPS-only Yahoo callback URLs.
- Store secrets only in the host's encrypted environment settings.
- Set secure-cookie behavior for production.
- Add rate limiting, request logging, error monitoring, and a privacy policy.
- Review Yahoo's developer terms before commercial launch.
