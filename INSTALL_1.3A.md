# Install FantasyNextMove 1.3A

This is a small update package, not a complete replacement project.

## Copy into the existing repository

1. Open the extracted `fantasy-next-move-1.3A-update` folder.
2. Select everything inside it.
3. Drag those items into the existing local `fantasy-next-move` folder connected to GitHub Desktop.
4. Choose **Merge** when macOS asks about the `app`, `components`, or `lib` folders.
5. Choose **Replace** for matching files.

Merging these folders does not delete the other project files. It adds the new files and replaces only the included matching files.

## Expected GitHub Desktop changes

GitHub Desktop should show these 11 changed or new files:

- `CHANGELOG.md`
- `README.md`
- `RELEASE_NOTES_1.3A.md`
- `INSTALL_1.3A.md`
- `components/AppShell.tsx`
- `app/dashboard/page.tsx`
- `app/connect/page.tsx`
- `app/cleanup.css`
- `app/api/yahoo/connect/route.ts`
- `app/api/yahoo/callback/route.ts`
- `lib/yahoo/availability.ts`

Commit message:

```text
Release 1.3A access and presentation updates
```

Then click **Push origin** and wait for Vercel to report **Ready**.
