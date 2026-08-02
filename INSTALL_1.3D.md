# Install FantasyNextMove 1.3D

## Phase 1 — Replace the complete project

1. Download and unzip the complete 1.3D package.
2. Double-click `INSTALL_COMPLETE_PROJECT.command`.
3. Choose the existing `fantasy-next-move` folder already used by GitHub Desktop.
4. Wait for the success message.
5. Open GitHub Desktop.
6. Confirm the repository is `fantasy-next-move` and the branch is `main`.
7. Use the exact Summary and Description in `GITHUB_DESKTOP_1.3D.md`.
8. Click **Commit to main**.
9. Click **Push origin**.
10. Wait for Vercel to finish the deployment.

## Phase 2 — Run Supabase SQL

1. Open Supabase.
2. Open the FantasyNextMove project.
3. Click **SQL Editor**.
4. Click **New query**.
5. Paste the complete contents of `COPY_PASTE_SQL_1.3D.sql`.
6. Click **Run**.
7. A result such as `Success. No rows returned` is expected.

The migration preserves existing beta testers as complimentary All Access accounts.

## Phase 3 — Configure Stripe in Test mode

Follow `BILLING_SETUP_1.3D.md` from top to bottom. Keep Stripe in Test mode.

## Phase 4 — Add Vercel variables and redeploy

Add the Stripe price, coupon, secret, webhook, site URL, and optional Tradyr values listed in `.env.example`. Keep every secret private. Redeploy Production after saving the variables.

## Phase 5 — Verify

1. Open the public Pricing page.
2. Create a new test account without an invitation.
3. Purchase a Test-mode plan.
4. Confirm Account changes from no plan to the purchased plan.
5. Confirm the correct league limit.
6. Confirm Trade Lab is locked to the imported league format.
7. Confirm an All Access account can open Dashboard and Record Book.
8. Confirm a Trade Lab-only account cannot open All Access features.
9. Confirm Manage Billing opens Stripe Customer Portal.
10. Submit and approve one Test-mode refund.
