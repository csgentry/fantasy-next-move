# Changelog

## 1.0.0

- Added Yahoo Fantasy OAuth authorization-code flow.
- Added encrypted HTTP-only Yahoo token storage and automatic access-token refresh.
- Added Yahoo season import for leagues, standings, owners, teams, rosters, and player metadata.
- Added Yahoo disconnect and connection-status endpoints.
- Added Sleeper historical traversal through `previous_league_id` and championship bracket detection.
- Added Yahoo historical traversal through renewed-league keys.
- Rebuilt Record Book to calculate manager records, aliases, titles, best seasons, and scoring leaders from imported history.
- Rebuilt Trade Lab around connected teams, connected players, editable values, and roster-fit adjustments.
- Unified demo, Sleeper, and Yahoo data behind one provider-neutral model.
- Added multi-provider connection interface and persistent selected-league state.

## 0.2.0

- Fixed connected-user roster selection.
- Added manager switching and Sleeper player resolution.
