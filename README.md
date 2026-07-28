# FantasyNextMove

FantasyNextMove is a mobile-friendly fantasy-football decision and league-history app built with the Next.js App Router. The current release is a private beta.

## Working product areas

- Responsive dashboard with power rankings, contender scoring, record context, and prioritized Next Moves
- Public, read-only Sleeper username and season import
- Secure Yahoo Fantasy OAuth connection and encrypted token handling
- Yahoo league import code for standings, teams, owners, rosters, and players after Fantasy API approval
- Source-aware roster room for Sleeper and Yahoo
- Historical Sleeper traversal through `previous_league_id`
- Sleeper champion and runner-up detection from the winners bracket
- Historical Yahoo traversal through renewed-league keys
- Calculated manager leaderboard, aliases, titles, best seasons, and scoring records
- Connected-roster Trade Lab with locked Redraft and Dynasty values plus roster-fit adjustments
- Browser persistence for the selected provider, league, manager, and imported history

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Configure Yahoo Fantasy

1. Create an application in the Yahoo Developer Network.
2. Apply for Yahoo Fantasy Sports API read access.
3. Set the application callback URL to:

```text
http://localhost:3000/api/yahoo/callback
```

4. Copy the Consumer Key and Consumer Secret into `.env.local`:

```bash
YAHOO_CLIENT_ID=your_consumer_key
YAHOO_CLIENT_SECRET=your_consumer_secret
YAHOO_REDIRECT_URI=http://localhost:3000/api/yahoo/callback
FNM_COOKIE_SECRET=a_long_random_secret
```

Generate a cookie secret with:

```bash
openssl rand -base64 48
```

For production, use the exact HTTPS production domain in Yahoo's application settings and `YAHOO_REDIRECT_URI`.

## Validation commands

```bash
npm run typecheck
npm run lint
npm run build
```

## Security boundary

- The Yahoo Consumer Secret is server-only.
- Yahoo tokens are encrypted before being placed in an HTTP-only, same-site cookie.
- The browser never receives the Yahoo refresh token in JavaScript.
- Sleeper and Yahoo imports are read-only.
- FantasyNextMove does not submit lineup changes, waiver claims, trades, or commissioner changes.
- Real credentials belong only in deployment environment variables, never in GitHub.

## Trade Lab boundary

Trade Lab values are locked so every user receives a consistent result. Redraft and Dynasty modes use an internal beta model based on position, starter role, health, provider ranking data, age when available, lineup format, and roster fit.

The values are not a licensed consensus market feed. Draft-pick values, IDP-specific models, and independently validated production rankings are still required before the model should be marketed as authoritative.

Stripe billing and hosted Supabase accounts are not activated. No payments should be collected until accounts, authorization, billing, legal pages, and production monitoring are complete.

## Launch checklist

See [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) for the account-specific steps required before public launch.
