# Shared interface refinement

The production Next Move page at baseline 7785aff is the visual reference. Its document-height forest-to-near-black gradient now frames every authenticated AppShell page. Page-specific layouts and cream My Team roster/stats surfaces remain intact. Public marketing/legal/pricing layouts retain their existing shell.

Drawer rows use a 22px icon column, aligned left labels, consistent touch targets and existing grouped destinations. Active navigation uses a restrained cream surface and cream marker; Next Move retains its green icon and center position even while inactive. No brand artwork was edited.

A shared top-right account control uses a native auto popover (light dismiss, Escape and normal keyboard focus). It offers Account Settings, the existing Supabase Log Out action, and Switch Team / League when connected context is already available. Switching opens the existing saved-league selector. This is not a new provider picker or ownership mechanism. The saved-league action now updates account-scoped selection memory before navigating, preventing the old cached league from reappearing.

Profile imagery comes from the customer's connected-account avatar, independently of the selected fantasy team's imagery. No image is inferred from a different roster owner; a neutral fallback is used when no validated profile is available. Direct account/support visits can initially show that fallback if league context has not been loaded. The profile component reads existing account-scoped memory only, without adding API requests. Opening it disables link prefetch. The selection notification state is cleared with account caches and rejects superseded-owner results.

Existing account/session handling, authorization, entitlements, Yahoo boundaries, subscriptions, $7.99/$39.99 pricing, Coming Soon buttons, disabled live billing, Vercel settings, provider requests and polling policies are unchanged. Logout uses the existing endSession action, cache clearing, cross-tab notification and document navigation.

Verification includes account-memory and logout regressions, profile-image/source and no-selection fixtures, a two-league switch-handler fixture, drawer geometry, native profile dismissal, active marker colors, consistent gradients, no horizontal overflow, safe-area padding and all enabled routes. Browser fixtures are controlled local-build evidence, not live authentication claims. Actual production screenshots and live checks are separately reported with the deployed SHA. Founder visual approval remains required; no separate page redesign or Page 3 work is included.

Production visual inspection also verifies that the desktop profile control cannot overlap the connected-team label; the CSS-module dashboard header explicitly reserves account-control space. This is covered by a connected-league desktop regression in addition to the no-league shell checks.
