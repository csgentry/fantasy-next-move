# Set up the invite-only FantasyNextMove beta

Complete these steps before deploying this release. Real-league pages intentionally redirect to login until Supabase is configured.

## 1. Create a Supabase project

1. Sign in to Supabase and create a new project.
2. Save the database password somewhere secure.
3. Wait for the project to finish provisioning.

## 2. Create the database tables and security policies

1. In Supabase, open **SQL Editor**.
2. Choose **New query**.
3. Open `supabase/schema.sql` from this repository.
4. Copy the entire file into the SQL Editor.
5. Click **Run**.
6. Confirm the query completes without an error.

The schema creates profiles, invite codes, account-owned providers, encrypted provider credentials, leagues, league history, and Row Level Security policies.

## 3. Copy the Supabase keys into Vercel

In Supabase, open the project's API settings and locate:

- Project URL
- Publishable key
- Service role key

In Vercel, open **FantasyNextMove → Settings → Environment Variables** and add:

```text
NEXT_PUBLIC_SUPABASE_URL = the Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = the Supabase publishable key
SUPABASE_SERVICE_ROLE_KEY = the Supabase service role key
```

Use **Production** as the environment. Mark `SUPABASE_SERVICE_ROLE_KEY` as sensitive. Never place the service role key in GitHub, browser code, chat, or screenshots.

## 4. Configure authentication URLs

In Supabase, open **Authentication → URL Configuration**.

Set the Site URL to:

```text
https://fantasy-next-move.vercel.app
```

Add these Redirect URLs:

```text
https://fantasy-next-move.vercel.app/auth/confirm
https://fantasy-next-move.vercel.app/auth/callback
https://fantasy-next-move.vercel.app/update-password
```

For local testing, also add:

```text
http://localhost:3000/auth/confirm
http://localhost:3000/auth/callback
http://localhost:3000/update-password
```

## 5. Require email confirmation

In **Authentication → Providers → Email**, keep email/password enabled and require email confirmation.

The application supports both Supabase PKCE `code` callbacks and token-hash email links. For an explicit server-side template, set the confirmation link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your FantasyNextMove account</a>
```

Set the recovery link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password">Reset your FantasyNextMove password</a>
```

## 6. Create the first invite code

Generate a long random code in a password manager. Do not use the example code below for a real invite.

In Supabase SQL Editor, run:

```sql
insert into public.beta_invites (code_hash, email, max_uses, expires_at)
values (
  encode(digest('PASTE-YOUR-LONG-RANDOM-CODE-HERE', 'sha256'), 'hex'),
  lower('tester@example.com'),
  1,
  now() + interval '14 days'
);
```

- Replace the code with the exact invite you will privately send.
- Replace the email with the invited person's email.
- Set `email` to `null` only when the code may be used by any email.
- Keep `max_uses` at `1` for ordinary invitations.

The database stores only the hash, so keep the original plaintext code until the tester has used it.

## 7. Redeploy

After adding the Supabase variables:

1. Open the newest Vercel deployment.
2. Click **Redeploy**.
3. Leave **Use existing Build Cache** unchecked for this first authentication deployment.
4. Confirm the production domain remains `fantasy-next-move.vercel.app`.

## 8. Test in a private browser window

Test this exact sequence:

1. Open the homepage and verify the fictional sample dashboard remains public.
2. Open `/connect` and verify it redirects to login.
3. Create an account with the invite code.
4. Confirm the email.
5. Sign in.
6. Import a Sleeper league.
7. Open the same account in another browser and verify the saved league follows the account.
8. For a Dynasty league, confirm Trade Lab shows the correct future picks for both teams.
9. Sign out and confirm real-league pages are protected.
10. Delete a test account and verify its Supabase rows are removed by cascade.

## 9. Yahoo note

Keep the existing Yahoo environment variables. Yahoo OAuth tokens are encrypted with `FNM_COOKIE_SECRET` and stored in the server-only `provider_credentials` table so the connection can follow the signed-in account. Yahoo Fantasy data will still show the approval-pending message until Yahoo grants Fantasy Sports API access.
