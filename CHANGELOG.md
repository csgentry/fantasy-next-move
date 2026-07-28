# Changelog

## 1.1.0

- Removed all manual player-value editing from Trade Lab.
- Added locked Redraft and Dynasty modes.
- Added format-aware values using provider player rank, age when available, health, starter role, Superflex, and tight-end-premium context.
- Added league-type detection for Sleeper imports and format labels on league cards and the dashboard.
- Added player filters, side totals, reset controls, fair-value tolerance, clearer verdicts, and stronger mobile layouts.
- Added richer Sleeper player profiles including age, experience, and search rank.
- Updated public copy and documentation so the app no longer describes Trade Lab values as editable.

## 1.0.0

- Added Yahoo Fantasy OAuth authorization-code flow.
- Added encrypted HTTP-only Yahoo token storage and automatic access-token refresh.
- Added Yahoo season import for leagues, standings, owners, teams, rosters, and player metadata.
- Added Yahoo disconnect and connection-status endpoints.
- Added Sleeper historical traversal through `previous_league_id` and championship bracket detection.
- Added Yahoo historical traversal through renewed-league keys.
- Rebuilt Record Book to calculate manager records, aliases, titles, best seasons, and scoring leaders from imported history.
- Added the initial connected-roster Trade Lab and roster-fit engine.
- Unified sample, Sleeper, and Yahoo data behind one provider-neutral model.
- Added multi-provider connection interface and persistent selected-league state.

## 0.2.0

- Fixed connected-user roster selection.
- Added manager switching and Sleeper player resolution.
