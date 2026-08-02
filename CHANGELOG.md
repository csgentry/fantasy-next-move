# Changelog

## 1.3C

- Added Sleeper weekly projection and actual-stat imports with defensive response normalization.
- Added league-specific fantasy scoring using each connected league's scoring settings.
- Added account-owned weekly player snapshot storage, projection-accuracy tracking, and a secured daily sync job.
- Integrated projections and recent production into Power Rankings, optimized lineups, Trade Lab values, and personalized player recommendations.

## 1.3B

- Added a complete league-wide Power Rankings Engine with starter strength, bench depth, positional grades, all-play records, expected wins, luck ratings, contender rankings, dynasty rankings, weekly movement, and explanations.
- Restored team-by-team power ranking inspection while keeping personalized Priority Boards private to the connected user.

## 1.3A-beta

- Reordered the primary sidebar to Dashboard, Trade Lab, Record Book, My Leagues, and Connect League.
- Disabled new Yahoo connections in both the interface and OAuth routes, and replaced the unfinished flow with a clear Coming Soon state until Fantasy Sports API approval is complete.
- Locked the Dashboard Priority Board, contender score, and roster snapshot to the connected user's roster.
- Removed other-team Dashboard switching and made Power Ranking rows non-interactive.
- Expanded Power Rankings to display every team in the connected league.

## 1.2.0-beta

- Added an administrator-only Beta Admin dashboard for secure single-use invite creation, review, copying, and expiration.
- Added invite-only Supabase authentication with signup, email confirmation, login, password reset, logout, and account deletion.
- Added invite-code hashing and atomic invite redemption.
- Added server-side beta-access protection for real-league pages and APIs.
- Added account-owned league and history persistence and retired browser-only real-league storage.
- Added a My Leagues account library for reopening saved leagues without reimporting.
- Added stricter Row Level Security and prevented users from self-approving beta access or changing plans.
- Added encrypted account-owned Yahoo credential storage so the Yahoo connection can follow the signed-in account.
- Added Sleeper future draft-pick ownership reconstruction using original picks plus traded-pick records.
- Added exact draft slots when Sleeper supplies an upcoming draft order.
- Added dynasty draft picks as locked Trade Lab assets.
- Added early, mid, and late pick projections with a neutral preseason fallback.
- Added Privacy Notice and Private Beta Terms pages.
- Improved API authentication responses and Yahoo disconnect behavior.

## 1.1.0-beta

- Removed all manual player-value editing from Trade Lab.
- Added locked Redraft and Dynasty modes.
- Added format-aware values using player-directory rank, age when available, health, starter role, Superflex, and tight-end-premium context.
- Added league-type detection for Sleeper imports and format labels on league cards and the dashboard.
- Added player filters, side totals, reset controls, fair-value tolerance, clearer verdicts, and stronger mobile layouts.
- Added richer Sleeper player profiles including age, experience, and search rank.
- Updated public copy so the app no longer describes Trade Lab values as editable.

## 1.0.0-beta

- Added Yahoo Fantasy OAuth authorization-code flow.
- Added encrypted HTTP-only Yahoo token storage and automatic access-token refresh.
- Added Yahoo season import for leagues, standings, owners, teams, rosters, and player metadata.
- Added Sleeper and Yahoo historical league traversal.
- Added the initial Record Book and connected-roster Trade Lab.
- Unified sample, Sleeper, and Yahoo data behind one provider-neutral model.
