# Next Move synchronization and presentation

This homepage uses the existing authenticated account, Sleeper integration and player-analysis session. No database or infrastructure configuration changes are required.

## Freshness

- On entry, retrieve the signed-in account's connected league matchups with `cache: no-store`. The API authenticates with Supabase and queries leagues for that user only; its response is `private, no-store`.
- Refresh scores every two minutes when a connected league has a live matchup, five minutes for upcoming or unknown periods, and fifteen minutes for only completed matchups or no leagues. These are product polling intervals, not a claim about Sleeper's publication cadence.
- Returning to a visible/focused page triggers a score refresh if at least thirty seconds have elapsed since its last attempt. In-flight requests are not duplicated; hidden pages do not fetch. Failures retry after five minutes and expose a contextual retry button.
- The separate account-scoped analysis session retains its existing five-minute cache. The homepage refreshes analysis after five minutes while visible, and when returning after that interval. It does not refetch all player analysis every time scores update.
- One unobtrusive score timestamp reports the oldest successful update among displayed leagues. Roster availability retains its analysis-check timestamp. On failure, warn that displayed data may be older.

## Data presentation

League header imagery comes exclusively from the provider's league avatar. Team and connected-customer imagery retain their own fields. Missing league artwork uses a neutral icon, never a team logo. Provider ownership is verified before selecting or displaying a refreshed team.

Missing scores remain null and display an em dash. Actual zero is preserved. Provider-defined matchup periods and schedule status determine week and state. Final matchups show final scores without a duplicate projected total or purported future win probability. Standings appear only when supplied; no provider-specific tiebreak rules are invented.

Projected final totals and whole-number win chances remain FNM estimates, distinct from provider scores. The existing model combines actual points and unplayed-starter projections with historical projection errors. It assumes independent approximately normal scoring errors and is not independently calibrated. Estimates are withheld when required history, current data, game status or remaining-game information is unavailable. This is not FantasyPros' model or provider-supplied live odds.

The homepage excludes the engine's `sell-high` observation rule because one projection beat does not establish trade value. Supported lineup, waiver and roster-fit trade recommendations remain eligible. The underlying engine and other page layouts are unchanged.

Before Kickoff selects only players on the selected roster with a provider availability designation, puts starters first, and preserves the designation text. Questionable is not converted to Out. Player-detail and lineup routes remain available.

## Visual scope

The document-height CSS background fades from forest at the top through darker stops to near-black at the bottom. A bounded, non-repeating radial light adds upper-page depth. The mobile header is transparent over that same background. Bottom navigation uses a dark supporting gradient, the existing five destinations, and safe-area padding. No image, canvas, animation, blur layer or scrolling JavaScript was added.

Only the Next Move shell gets the revised footer and sidebar account presentation. Mobile legal/account access remains available through More and Account. All other page layouts retain their existing shell behavior. Existing approved brand files and logo-size rules remain unchanged.

Browser screenshots and founder review are required to assess final visual acceptance; automated tests and successful builds do not establish it.
