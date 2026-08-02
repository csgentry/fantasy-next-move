# Install the complete FantasyNextMove 1.3C project

This is a complete replacement package. Do not choose or merge individual source files.

## Mac one-step replacement

1. Make sure GitHub Desktop shows no uncommitted changes.
2. Extract the complete ZIP.
3. Double-click `INSTALL_COMPLETE_PROJECT.command` inside the extracted folder.
4. Choose the existing `fantasy-next-move` repository folder used by GitHub Desktop.
5. Return to GitHub Desktop and use `GITHUB_DESKTOP_1.3C.md` for the Summary and Description.
6. Commit to `main` and push origin.
7. In Supabase SQL Editor, run `supabase/migrations/20260729_player_intelligence.sql` once.
8. In Vercel Production environment variables, add `CRON_SECRET` with a random value of at least 16 characters, then redeploy.

The installer verifies the Git remote, refuses to overwrite uncommitted work, preserves `.git` and local environment files, and replaces the complete tracked project in one operation.
