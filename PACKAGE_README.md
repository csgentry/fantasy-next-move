# FantasyNextMove 1.3C complete replacement package

This archive contains the entire FantasyNextMove project with Release 1.3C already installed. It is not a partial patch.

## Install without manual merging

On Mac, double-click `INSTALL_COMPLETE_PROJECT.command` and choose the existing `fantasy-next-move` folder used by GitHub Desktop.

The installer:

- Verifies the selected folder is connected to `csgentry/fantasy-next-move`
- Refuses to run when uncommitted changes are present
- Preserves the hidden `.git` repository connection
- Preserves local environment files, Vercel metadata, `node_modules`, and `.next`
- Replaces the complete tracked project contents in one operation

After installation, use `GITHUB_DESKTOP_1.3C.md` for the exact commit Summary and Description.

## Included

- Beta Admin and invite-only authentication
- Sleeper league import, saved leagues, and historical Record Book
- Yahoo Coming Soon state
- League-wide Power Rankings Engine
- Sleeper weekly projections and actual player statistics
- League-specific fantasy scoring
- Weekly account-owned player snapshot history
- Projection accuracy tracking
- Projection-aware Trade Lab values
- Personalized lineup, waiver, trade-target, and sell-high recommendations
- Secured daily Vercel snapshot job

## Required after deployment

1. Run `supabase/migrations/20260729_player_intelligence.sql` in Supabase SQL Editor.
2. Add `CRON_SECRET` to Vercel Production using a random value of at least 16 characters.
3. Redeploy after adding the variable.

Existing required Vercel Production variable:

```text
FNM_ADMIN_EMAILS=csgentry@outlook.com
```
