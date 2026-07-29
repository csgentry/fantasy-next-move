# FantasyNextMove complete package with Beta Admin

This folder is the complete FantasyNextMove project, not a partial patch.

## Included Beta Admin features

- Administrator-only `/admin` route
- Secure, server-generated, email-bound, single-use invite codes
- One-click copying immediately after creation
- Review of active, used, expired, and revoked invitations
- Manual expiration of active invitations
- Server-side authorization using the signed-in Supabase user

## Required Vercel variable

Add this variable to **Production** only:

```text
FNM_ADMIN_EMAILS=csgentry@outlook.com
```

- Sensitive: off
- Preview: off
- Development: off
- Custom preview branch: blank

For multiple administrators, separate addresses with commas.

## Deploy

Replace the damaged local project folder with this complete folder. Then commit and push the complete project:

```bash
git add .
git commit -m "Add beta invite admin page"
git push origin main
```

Vercel will build the production deployment. After it succeeds, sign in with an approved administrator email and open:

```text
https://fantasynextmove.com/admin
```

No additional Supabase SQL is required because the existing `beta_invites` table already supports this page.
