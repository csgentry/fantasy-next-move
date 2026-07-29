# FantasyNextMove 1.3B complete replacement package

This archive contains the entire FantasyNextMove project with Release 1.3B already installed. It is not a partial patch.

## Install without manual merging

On Mac, double-click `INSTALL_COMPLETE_PROJECT.command` and choose the existing `fantasy-next-move` folder used by GitHub Desktop.

The installer:

- Verifies the selected folder is connected to `csgentry/fantasy-next-move`
- Refuses to run when uncommitted changes are present
- Preserves the hidden `.git` repository connection
- Preserves local environment files, Vercel metadata, `node_modules`, and `.next`
- Replaces the complete tracked project contents in one operation

After installation, use `GITHUB_DESKTOP_1.3B.md` for the commit Summary and Description.

## Included

- Beta Admin and invite-only authentication
- Sleeper league import and saved leagues
- Yahoo Coming Soon state
- Trade Lab
- Record Book
- Complete league-wide Power Rankings Engine
- Starter and bench strength
- Positional grades
- All-play record, expected wins, and luck rating
- Overall, Contender, and Dynasty views
- Ranking movement and explanations

Required Vercel Production variable:

```text
FNM_ADMIN_EMAILS=csgentry@outlook.com
```
