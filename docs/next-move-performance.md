# Next Move performance

This milestone changes data loading, not the approved interface or brand assets.

## Measured problem

On the signed-in canonical production dashboard at `2f26c8a`, shell visibility took
372–581 ms and the selected matchup 905–1630 ms in repeated browser checks.
Completed analysis checks took 13293 and 14584 ms. A third check did not reach the
expected completed state within 16164 ms. These are browser-automation visibility
timings, not standardized Web Vitals or a throttled physical-phone measurement.

Vercel runtime warnings confirmed repeated fetch-cache failures: player feeds of
15.3 MB and projection feeds around 7.6 MB exceeded Next's 2 MB entry limit.
Foreground requests also performed sequential historical backfill, database
snapshot writes and duplicate historical matchup retrieval.

## Response path

- The existing shell and score loading remain independent of analysis.
- Dashboard analysis uses `mode: dashboard`; other tools retain their full payload.
- Current-week projections and last-completed-week accuracy inputs run in parallel.
- Rosters start alongside metadata requests and remain freshly fetched. Ownership,
  season and current provider state are checked before advice is produced.
- The dashboard requests one current matchup period, not every prior week.
- Snapshot persistence runs through Next `after` after sending the response. It is
  labeled `deferred`, not falsely reported as already saved. Older backfill remains
  with the existing authenticated scheduled job; no new cron or paid service.
- Entitlement lookup runs alongside source analysis and still applies on every
  response. The private response remains `private, no-store`.
- Overlapping server analysis coalesces only after authentication and owned-league
  lookup, keyed by user, league, mode and a saved-source fingerprint. Pending work
  is removed on settlement; completed customer responses are not shared-cached.
- Matchup clients request an authenticated NDJSON stream. Each completed league is
  published independently, with three provider jobs at a time. Existing JSON
  clients remain compatible. Navigating away aborts the client request.

## Cache boundaries

The shared durable cache accepts only anonymous NFL player, projection and stats
feeds from fixed Sleeper URL patterns. It cannot accept account endpoints, league
credentials, customer recommendations or arbitrary URLs. Player objects retain
every field consumed by the analysis code; scoring stat keys and numeric precision
are preserved. Unused provider metadata is omitted, then JSON is gzip-compressed
and base64-encoded before storage. Real sampled player/projection cache entries
were approximately 400 KB and 336 KB, respectively, below the 2 MB cache limit.
Inflight feed requests coalesce. Rejected fetches are not retained as successes.
Time-bucket keys plus an explicit source age check bound freshness, including
when the framework returns a stale revalidation entry.

Current player/projection feeds expire after 5 minutes, historical projections
after 24 hours, and completed stats after 15 minutes. League metadata and users
use 5 minutes; NFL state and schedule 2 minutes; current matchup scores 30 seconds.
Roster ownership is fetched without a reusable data cache.

The existing browser analysis cache remains memory-only and clears on account
change and page hide. Entries are partitioned by league, season, selected roster,
mode, current known week, roster ownership/players/slots and scoring source.
Fresh resolved values can be rendered during navigation and refresh without an
unnecessary empty recommendation state. Inflight refreshes coalesce. No customer
data is added to localStorage, sessionStorage, a public response cache or a shared
completed-analysis cache. Dashboard and full-tool payloads are distinct.

Follow-up live measurements identified a roughly 252 KB dashboard analysis
transfer and 1652 ms cached dashboard navigation waiting for saved selection.
The dashboard response now includes only the selected roster's profiles/player
detail breakdowns, all league starters required for forecasting, and the same
historical point/error samples without unused stat breakdowns. Recommendations
are computed before this reduction; full-tool payloads are unchanged. Forecast
equivalence is regression-tested.

The active league selection has a separate 60-second authenticated memory cache.
It coalesces reads and clears on account change/page hide. Selection writes
invalidate older reads, including a late response from the previous account.
It never replaces authorization on the API or persists private browser data.
Cached navigation can render the known selection immediately; expiry retrieves
the account-owned record again. League/team changes update the memory only after
the authenticated save succeeds.

## Diagnostics and verification

`/dashboard?performance=1` enables local browser console diagnostics only: navigation
TTFB, paint/LCP entries where supported, long tasks, league/analysis readiness and
same-origin resource duration/transfer size. There is no telemetry endpoint or
customer identifier in this output. The analysis response has stage-specific
`Server-Timing` headers; operational logs contain only durations for authentication,
owned-league lookup, sources and recommendations.

New regression cases cover oversized public-feed caching, failure recovery, stale
entry rejection, scoring/availability preservation, deferred owner-scoped writes,
same-account request coalescing, cross-account separation, progressive league
streaming and streaming authentication. Existing auth, billing, current-week,
forecast, missing-data and Yahoo tests remain required.

A controlled same-source service benchmark used 300 ms large-feed latency, 20 ms
metadata/reads and 30 ms writes. Three baseline runs took 1728–1737 ms with 23
requests, four blocking writes and two blocking reads. Optimized cold runs took
604–610 ms with nine requests and no blocking storage; warm runs took 41 ms with
five requests. Projection output was identical. These figures are fixtures,
not live production or mobile-network claims. The release report must separately
record comparable post-deployment browser timings and remaining measurement limits.
