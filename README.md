# FantasyNextMove

FantasyNextMove is an invite-only fantasy-football analysis beta built with the Next.js App Router, Supabase authentication, Sleeper imports, and Yahoo OAuth.

## Current beta features

- Public fictional sample league for signed-out visitors
- Invite-code account creation, email confirmation, login, password reset, logout, and account deletion
- Server-protected real-league pages and APIs
- Account-owned connected leagues and historical record books stored in Supabase; real league data is no longer persisted in browser local storage
- My Leagues library for reopening saved leagues on another device
- Public, read-only Sleeper username and season import
- Sleeper Redraft, Keeper, and Dynasty detection
- Sleeper future draft-pick ownership import, including traded picks and known draft slots
- Secure Yahoo OAuth with encrypted account-owned token storage
- Yahoo league import code ready for use after Fantasy API approval
- Locked Redraft and Dynasty Trade Lab values; users cannot edit values
- Dynasty trades containing players and imported draft picks
- Privacy Notice and Private Beta Terms

## Required setup

The application will not allow real-league access until Supabase is configured. Follow [`BETA_AUTH_SETUP.md`](./BETA_AUTH_SETUP.md) in order.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

YAHOO_CLIENT_ID=
YAHOO_CLIENT_SECRET=
YAHOO_REDIRECT_URI=
FNM_COOKIE_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY`, `YAHOO_CLIENT_SECRET`, and `FNM_COOKIE_SECRET` are server-only secrets. Never prefix them with `NEXT_PUBLIC_`, commit them to GitHub, paste them into client code, or share them in screenshots.

## Validation commands

```bash
npm run typecheck
npm run lint
npm run build
```

## Security boundary

- Real league connections and provider APIs require an authenticated, invite-approved beta account.
- Row Level Security restricts connected accounts, leagues, and history to the approved owner.
- Users cannot update their own `beta_access` or plan columns.
- Beta invite codes are stored only as SHA-256 hashes.
- Yahoo access and refresh tokens are encrypted before storage in a server-only table and are also cached in an HTTP-only cookie.
- Sleeper and Yahoo integrations are read-only.
- FantasyNextMove never submits lineups, waiver claims, trades, or commissioner actions.

## Trade Lab boundary

Trade Lab values are locked so users cannot manipulate the verdict. Redraft and Dynasty modes use an internal beta model based on player position, role, health, age when available, league settings, and roster fit. Dynasty mode also includes imported draft-pick ownership.

Future picks without a known draft slot are labeled as projected early, mid, or late. Preseason picks without meaningful standings default to mid rather than pretending an exact slot is known.

The model is experimental and is not a licensed consensus market-value feed.

## Current limitations

- Yahoo Fantasy data remains blocked until Yahoo approves the application for Fantasy Sports API access.
- Yahoo draft-pick support depends on what Yahoo exposes after approval; picks are never invented.
- No payments are collected during the private beta.
- Automated end-to-end tests, rate limiting, monitoring, and lawyer-reviewed legal documents remain required before a public launch.

See [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) for the remaining launch work.
