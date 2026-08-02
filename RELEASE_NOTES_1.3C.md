# FantasyNextMove 1.3C — Sleeper Player Intelligence

## What changed

- Added a Sleeper weekly projection importer and actual-stat importer.
- Added a league-specific fantasy scoring calculator that applies each connected league's scoring settings.
- Added account-owned weekly player snapshots in Supabase.
- Added projection-versus-actual accuracy reporting with sample size, mean absolute error, root mean squared error, bias, and within-three/within-five-point hit rates.
- Integrated weekly projections into optimized lineups, Power Rankings, roster analysis, and Trade Lab values.
- Added personalized lineup, waiver, trade-target, and sell-high recommendations for the connected user's roster.
- Added a secured daily Vercel snapshot job and an authenticated on-demand sync when a user opens a Sleeper league.
- Added graceful fallback behavior when projections, actual stats, or database storage are temporarily unavailable.

## Product rule

Sleeper supplies the league, roster, player, projection, and actual-stat inputs. FantasyNextMove applies the connected league's scoring rules and turns those inputs into account-specific decisions. Personalized recommendations remain limited to the connected user's roster.

## Required deployment steps

1. Run `supabase/migrations/20260729_player_intelligence.sql` once in the Supabase SQL Editor.
2. Add `CRON_SECRET` to Vercel Production using a random value of at least 16 characters.
3. Redeploy after adding the environment variable.

The application can load live data on demand before the migration is applied, but weekly snapshot history will not persist until the new table exists.
