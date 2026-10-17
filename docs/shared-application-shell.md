# Page 2 and shared application shell

The authenticated shell reuses the unchanged approved-header.svg artwork through the existing Brand component. Next Move content, dashboard styles, gradient and five bottom destinations are retained. Shared header controls now open a native modal navigation drawer and the existing account page. My Team uses a dark surrounding frame, compact cream roster rows and existing roster/projection/stat/schedule/lineup views. No player photos or unsupported schedule values were added.

## Navigation and accessibility

The drawer is portaled outside the sidebar so fixed mobile navigation styles cannot leak into its links. Native dialog provides modal screen-reader semantics, background inertness and Escape dismissal. Explicit first/last control focus wrapping keeps keyboard navigation inside the drawer in both Chromium and WebKit. Closing restores focus to the trigger; opening locks body scrolling and cleanup restores its prior value. The drawer remains scrollable across short and tall viewports, with safe-area padding and 44px minimum controls. Selecting any route closes it. Normal navigation does not change account selection or connected league state.

Account settings and billing use the existing protected account page, billing section anchor, provider connections use /connect, and full tool routes remain available. Admin access is in the drawer instead of a sixth primary destination. Help & Support points to useful connection/account guidance on More. No direct support address is currently configured; the page states this explicitly rather than inventing an address or a ticket service.

The desktop footer contains Privacy, Terms, Pricing, Support and Account. Mobile hides the duplicate footer. These links and the read-only provider disclosure remain accessible in the drawer and More. Existing Yahoo attribution is retained.

## Logout and protections

The drawer submits the existing Supabase server action. It awaits signOut with local scope to end this session, clears the SSR auth cookies through the existing server client, and redirects home. Next.js invalidates its router cache on the cookie mutation. Failed sign-out redirects to an explicit account error instead of silently claiming success. No auth/RLS/provider credential architecture, subscription entitlement, paid billing gate or database schema is changed.

Approved pricing remains $7.99 monthly / $39.99 annually, both buttons Coming Soon, and live billing remains disabled. No dependency, paid service, spending cap or infrastructure setting changes.

## Verification

- 115 unit tests, including successful asynchronous logout and returned/thrown logout errors.
- Local lint, typecheck and production build.
- Built application HTTP smoke and 28 production safety assertions.
- Local iPhone WebKit: drawer across six authenticated shell routes; focus containment/return, Escape, close control, route close, active primary link, body lock restoration, five destinations and no horizontal overflow.
- Controlled local document/API fixtures exercise UI only. They do not authenticate against Supabase or establish live provider verification. Separate production browser checks are required for actual account data, preserved selection and logout.
- Asset hash manifest verifies the approved header SVG, Yahoo mark and Brand component unchanged.

Founder review is required for Page 2. This work does not authorize Page 3 content redesign.
