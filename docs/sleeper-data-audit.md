# Sleeper supporting audit — 17 October 2026

Source baseline: cfe015dedf445f39fa1140816d33dd0a911ab06b. My Team and the shared-shell milestone are preserved; no new data feature is enabled by this audit.

## Rights finding

The official reference https://docs.sleeper.com/ describes read-only, token-free access for non-commercial purposes and requires a licensing discussion for commercial use. The October 6, 2026 General Terms also address approved integration partners, commercial integrations, data access and content/mark restrictions (sections 2.9, 9, 11): https://support.sleeper.com/en/articles/5486620-general-terms-of-use.

No executed Sleeper commercial grant was located in the checked repository, targeted Library/Outlook searches or relevant prior context. This is a limited evidence finding, not a declaration that no private agreement exists. Having no paying customers, user-entered league IDs, successful requests or an unrelated Yahoo agreement does not establish Sleeper permission. Written approval must explicitly cover the current prototype as well as any expansion. No request was sent or expense authorized. A draft inquiry and field-level inventory are separate review deliverables.

## Capability coverage

- Existing: user/league discovery, full rosters including reserve/taxi, league-wide ownership, scoring/roster settings, league users and image mapping, provider week, weekly matchups/actual scores, reconstructed standings, league traded picks and partial league-draft metadata. Legacy league history follows previous_league_id and winner brackets; it is not a full active history product.
- Unused documented readers: transaction history, trending adds/drops, consolation brackets, user draft lists, specific-draft metadata, actual draft selections and draft-level traded picks. Bounded internal technical probes returned HTTP 200 for 17 requests, including these selected capabilities. No new customer API, ingestion job, retention or UI was activated. Key presence is not a non-null/completeness guarantee or license.
- Matchup responses returned players_points and starters_points beyond the documentation example. Player-level fantasy-score history could potentially reduce dependence on separate stats services; it needs field stability, owner/period validation and commercial approval before use.
- Existing /stats/nfl, /projections/nfl and /schedule/nfl services on api.sleeper.com are not documented public API endpoints. No commercial contract or support/SLA was verified for them. Existing analysis must not be described as officially licensed merely because it currently returns values.
- The documented catalogue includes player identity, team, status and nullable injury/practice metadata. news_updated and injury_notes are not a licensed news feed; external player IDs do not establish provider-supplier relationships or image rights. No player headshot or article source was enabled. Neutral imagery remains.
- The public API cannot submit lineups, waivers, trades or draft picks. Standings and win chances in FNM remain labeled calculations rather than official provider rankings/probabilities.

## Safe existing-request corrections

The existing full-player lookup now uses the existing compressed public-feed cache at its unchanged 24-hour TTL. The old raw Next fetch could exceed the raw cache budget. Only requested IDs are returned, including inactive-player fallbacks; cache entries contain public player fields, never account selections/credentials. The allowlist adds only the exact unfiltered URL already used by that handler; it does not admit transactions, trending, rosters or arbitrary hosts.

Legacy import, history and power-data requests gain the same 12-second network deadline already used by newer readers. No retries, polling, TTL expansion, additional endpoint requests or schema changes are added. The legacy power-data reader now omits missing/invalid scores and preserves numeric zero and commissioner overrides.

## Deferred performance/data work

The filtered active catalogue still uses a five-minute policy in intelligence, while the official reference recommends sparse/daily catalogue updates. Reconcile catalogue versus injury freshness with Sleeper's approved policy; do not silently switch injury freshness or claim the existing cadence is licensed. Existing dashboard intervals are two minutes for Live, five for Upcoming/unknown and fifteen for Final; focus may refresh after thirty seconds. These are implementation facts, not a provider requirement. A future pregame policy should favor visit/focus refresh and longer bounded intervals. No new polling is introduced here.

Preserve compressed/coalesced anonymous-feed caching, account-scoped five-minute analysis memory, fresh ownership checks before waiver/trade advice and generation/abort guards. Do not share account payloads, ownership, entitlements or recommendations through the public cache. Existing daily active-league cron remains unchanged; it was not triggered for this audit.

## Verification and preservation

Targeted controlled tests cover daily catalogue compression/deduplication/requested-ID isolation, empty/invalid requests, provider deadlines without saving connections, and zero-versus-missing legacy scores. The full suite, lint/typecheck/build and release checks must pass before release. Live endpoint probes establish transport/schema accessibility only; current historical/analysis evidence is separately identified and is not a claim of commercial permission.

No logos, My Team content/layout, Next Move styling, navigation, authentication, account isolation, Yahoo provisioning, pricing, Stripe shutdown, Vercel settings, cron configuration or paid providers are changed. Pending data activation remains held for written approval. Page 2 founder review remains open; Page 3 is not started.
