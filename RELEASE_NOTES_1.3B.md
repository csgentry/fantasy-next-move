# FantasyNextMove 1.3B — Power Rankings Engine

## What changed

- Rebuilt league power rankings around roster quality and schedule-neutral results.
- Added starter strength and bench strength for every team.
- Added QB, RB, WR, and TE grades with league-relative ranks.
- Added all-play records from completed Sleeper matchup weeks.
- Added expected wins and a luck rating that compares actual results with schedule-neutral performance.
- Added separate Overall, Contender, and Dynasty ranking views.
- Added ranking movement from the previous completed week when weekly data is available.
- Added a detailed team inspector explaining why every roster ranks where it does.
- Restored the ability to inspect every team without exposing another manager's private Priority Board.
- Added a dedicated authenticated Sleeper power-data endpoint.

## Product rule

League-wide power rankings and roster explanations are visible for every team. Personalized Next Moves remain available only for the connected user's roster.

## Transparency

The full model structure, weights, ranking movement method, and data-confidence rules are documented in `POWER_RANKINGS_METHOD.md`.
