# Sleeper Player Intelligence methodology

FantasyNextMove 1.3C turns Sleeper player data into league-specific analysis instead of treating one generic fantasy-point total as correct for every league.

## Data flow

1. The saved Sleeper league supplies rosters, starters, lineup slots, scoring settings, and team records.
2. Sleeper player metadata supplies identity, position, NFL team, age, experience, depth-chart position, and availability information when present.
3. Weekly projection and actual-stat feeds are normalized into numeric stat lines.
4. FantasyNextMove multiplies those statistics by the connected league's scoring settings.
5. One account-owned snapshot per player, league, season, and week is saved in Supabase.
6. Dashboard, Power Rankings, Trade Lab, and personalized recommendations consume the same normalized snapshot data.

## League-specific scoring

The calculator supports direct Sleeper scoring keys, common aliases, position-specific reception bonuses, and common passing/rushing/receiving yardage bonuses. Each score includes a contribution breakdown so future interfaces can explain exactly where the fantasy points came from.

## Projection accuracy

For completed weeks with both a projection and an actual result, the app calculates:

- Mean absolute error
- Root mean squared error
- Average bias
- Percentage within three fantasy points
- Percentage within five fantasy points

Accuracy is reported with its sample size. Missing projection or actual rows are excluded rather than treated as zero.

## Power Rankings

Projected optimized starter totals now contribute to roster strength. Projection coverage is displayed so the model does not pretend incomplete data is equally reliable. Weekly matchup history still drives all-play records, expected wins, schedule luck, and ranking movement.

## Trade Lab

Player values now incorporate the current league-specific weekly projection and the most recent projection-versus-actual result. This is an additional production signal, not a claim that one week of projection data determines long-term market value.

## Personalized recommendations

The connected user's Priority Board can identify:

- A projected bench player who should replace a lower-projected starter
- An unrostered player who improves the user's weakest projected position group
- A trade target who fits the user's weakness and is outside another team's imported starting lineup
- A sell-high candidate who materially exceeded the previous projection

Other managers' private recommendations are never generated in the user's Dashboard. League-wide roster explanations remain visible in Power Rankings.

## Refresh and storage

Opening a saved Sleeper league triggers an authenticated on-demand sync. A secured daily Vercel cron route refreshes active Sleeper leagues and gradually fills missing completed weeks. The server caches upstream responses and upserts snapshots in batches.

## Limitations

- Sleeper projection and actual-stat response shapes can evolve; the importer is defensive, but live validation remains necessary when the season begins.
- Projections are estimates, not guarantees.
- Player metadata and injury fields may be incomplete for some players.
- The current recommendation engine is an analytical beta and does not submit lineups, claims, or trades.
