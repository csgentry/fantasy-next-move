# FantasyNextMove Cleanup Pass 1

This build focuses on public credibility, privacy, and beta clarity.

## Changed

- Replaced real league-member names and team names in the public demo with fictional sample data.
- Converted raw Yahoo provider errors into clear user-facing messages.
- Clarified that Yahoo OAuth is working while Fantasy API approval is pending.
- Removed unfinished paid plans from primary navigation and replaced the pricing page with a no-payment private-beta notice.
- Added active navigation states and an app footer.
- Added an explicit sample-data banner on the demo dashboard.
- Removed the visible v1 label and tightened public-facing product claims.
- Preserved the Vercel TypeScript fix in the Sleeper history route.

## Still required before public launch

- Add official Yahoo Fantasy logo and attribution after Yahoo provides approved brand assets.
- Add Privacy Policy and Terms pages.
- Replace browser-only league storage with authenticated hosted accounts.
- Add automated build checks and tests.
- Validate imported historical records against real leagues.
