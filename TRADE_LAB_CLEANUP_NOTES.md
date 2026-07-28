# FantasyNextMove Cleanup Pass 2

## Trade Lab
- Removed all player-value editing.
- Added Redraft and Dynasty modes.
- Added format-aware locked values using position, starter role, health, provider rank, age when available, Superflex, and TE-premium signals.
- Added clear team directions, position filters, totals, reset control, fair-value tolerance, and a roster-fit breakdown.
- Added loading and error handling for player profiles.
- Clarified that the model is a beta estimate and never submits trades.

## App-wide cleanup
- Added imported league type to the normalized model.
- Added Sleeper league-type detection and richer player profiles.
- Displays league format on imported league cards and the dashboard.
- Updated home page and beta messaging so it no longer says values are editable.
- Tightened sidebar and footer language.
- Added a separate CSS cleanup layer for easier maintenance.
