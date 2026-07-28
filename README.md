# FantasyNextMove v1

FantasyNextMove is a mobile-friendly fantasy-football decision and league-history app built with the Next.js App Router.

## Working product areas

- Responsive dashboard with power rankings, contender scoring, record context, and prioritized Next Moves
- Public Sleeper username and season import
- Secure Yahoo Fantasy OAuth connection
- Yahoo standings, teams, owners, rosters, and player import
- Automatic Yahoo access-token refresh using an encrypted HTTP-only cookie
- Source-aware roster room for Sleeper and Yahoo
- Historical Sleeper traversal through `previous_league_id`
- Sleeper champion and runner-up detection from the winners bracket
- Historical Yahoo traversal through renewed-league keys
- Calculated manager leaderboard, aliases, titles, best seasons, and scoring records
- Connected-roster Trade Lab with editable values and positional-fit adjustments
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
2. Request access to **Fantasy Sports** with read permission.
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

For production, use your HTTPS domain in both Yahoo's application settings and `YAHOO_REDIRECT_URI`.

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
- Sleeper and Yahoo imports are read-only in this version.
- FantasyNextMove does not submit lineup changes, waiver claims, trades, or commissioner changes.

## Honest product boundary

The Trade Lab currently provides editable user values plus a transparent roster-fit engine. A commercially licensed or independently maintained live player-valuation feed is still required before the default numbers should be marketed as authoritative market values.

Stripe billing and hosted Supabase accounts remain environment-ready product infrastructure, not activated services in this package. A real Stripe account, products, webhook signing secret, and deployment domain are required before subscriptions can collect money.

## Launch checklist

See [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) for the account-specific steps required to deploy Yahoo OAuth, hosted persistence, billing, and production security.
