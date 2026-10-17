# Page 2 and shared application shell

The authenticated shell reuses the unchanged approved-header.svg artwork through the existing Brand component. Next Move content, dashboard styles and gradient are retained. The founder-approved primary navigation is My Team, Trade Lab, Next Move (center), Start/Sit and League. The shared desktop navigation follows the same order. Shared header controls now open a native modal navigation drawer and the existing account page. My Team uses a dark surrounding frame, compact cream roster rows and Roster, Start/Sit, Stats and Schedule views with weekly projections consolidated into Roster. No player photos or unsupported schedule values were added.

## Navigation and accessibility

The drawer is portaled outside the sidebar so fixed mobile navigation styles cannot leak into its links. Native dialog provides modal screen-reader semantics, background inertness and Escape dismissal. Explicit first/last control focus wrapping keeps keyboard navigation inside the drawer in both Chromium and WebKit. Closing restores focus to the trigger; opening locks body scrolling and cleanup restores its prior value. The drawer remains scrollable across short and tall viewports, with safe-area padding and 44px minimum controls. Selecting any route closes it. Normal navigation does not change account selection or connected league state.

Account settings and billing use the existing protected account page, billing section anchor, provider connections use /connect, and full tool routes remain available. Admin access is in the drawer instead of a sixth primary destination. Help & Support points to useful connection/account guidance on More. No direct support address is currently configured; the page states this explicitly rather than inventing an address or a ticket service.

The desktop footer contains Privacy, Terms, Pricing, Support and Account. Mobile hides the duplicate footer. These links and the read-only provider disclosure remain accessible in the drawer and More. Existing Yahoo attribution is retained.

## Logout and protections

The drawer and account page share LogoutControl. It awaits Supabase signOut with local scope, clears the SSR auth cookies, aborts and clears account-scoped analysis/selection memory, clears the Yahoo client selection, broadcasts logout to other open application tabs, and performs a full document navigation home. Failed sign-out displays an explicit error without claiming success. Other browser tabs clear their in-memory account state before returning to login. No auth/RLS/provider credential architecture, subscription entitlement, paid billing gate or database schema is changed.

Approved pricing remains $7.99 monthly / $39.99 annually, both buttons Coming Soon, and live billing remains disabled. No dependency, paid service, spending cap or infrastructure setting changes.

## Verification

- Unit coverage includes entitlement-aware return paths, canonical login routing, query preservation, successful asynchronous logout, returned/thrown logout errors, missing versus zero projections, owned historical rows and fantasy-week opponent association.
- Local lint, typecheck and production build.
- Built application HTTP smoke and 28 production safety assertions.
- Local iPhone WebKit: drawer across six authenticated shell routes; focus containment/return, Escape, close control, route close, active primary link, body lock restoration, five destinations and no horizontal overflow.
- Controlled local document/API fixtures exercise UI only. They do not authenticate against Supabase or establish live provider verification. Separate production browser checks are required for actual account data, preserved selection and logout.
- Asset hash manifest verifies the approved header SVG, Yahoo mark and Brand component unchanged.

Founder review is required for Page 2. This work does not authorize Page 3 content redesign.

## Post-login and My Team update

Successful email/password sign-in, confirmation callbacks, recovery completion and authenticated GET /login resolve through the same server-side entitlement helper. The default is /dashboard. Existing authenticated free/base access remains unchanged, including the no-league state; premium Trade Lab remains gated. Only known internal application paths are accepted as return destinations. Unauthenticated redirects preserve safe tool queries, and production auth callbacks remain on the canonical domain.

Roster is the default and includes every existing starting/bench/reserve/taxi grouping, weekly projected points and a starter total that reports incomplete coverage. Player details retain projected statistics and actual results. Legacy ?view=projections opens the consolidated Roster. Stats shows owned players with finite recorded results from completed weeks, with historical projections labeled separately; unavailable season totals/averages are omitted. Schedule uses actual provider fantasy matchup periods and scores and permits selecting known weeks.

The verified payload does not supply NFL opponents, kickoff times, home/away, bye weeks or defensive ranks. Therefore the authorized fallback retains functional Start/Sit as tab two rather than creating a decorative Matchups tab. Schedule explicitly describes the NFL schedule limitation. No invented schedule, photos, rankings or statistics are introduced. Missing provider scores are omitted rather than coerced to zero; verified zero scores remain valid.

Tab changes reuse the existing authenticated five-minute intelligence cache and sixty-second selected-league memory; view names are not cache keys and switching tabs adds no analysis calculation. No new provider requests, polling, third-party dependencies or paid infrastructure are introduced. Stats/Schedule calculations are local to the selected account payload. Authenticated /login adds an entitlement read only on that route; dashboard rendering does not add an entitlement query.
