# FantasyNextMove 1.3D complete replacement package

This archive contains the entire FantasyNextMove project with the 1.3D Launch Candidate already installed. It is not a partial patch.

## Install without manual merging

Double-click `INSTALL_COMPLETE_PROJECT.command` on Mac and choose the existing `fantasy-next-move` repository folder used by GitHub Desktop.

The installer verifies the correct repository, refuses to overwrite uncommitted work, preserves `.git`, local environment files, Vercel metadata, `node_modules`, and `.next`, and replaces the complete tracked project.

Use `GITHUB_DESKTOP_1.3D.md` for the exact commit text.

## Included

- Two-decimal fantasy points and one-decimal ranking indexes
- Vertical starters, bench, taxi, and injured-reserve lineup
- Overall Power, Win Now, and Dynasty Future context
- Preseason-aware dashboard and improved roster recommendations
- League-locked Redraft, Keeper, and Dynasty Trade Lab 2.0
- Multiple saved-league selector
- 0–10,000 values, ranks, tiers, ranges, confidence, rookies, picks, and package adjustments
- Permitted Tradyr composite market signal with visible attribution and independent fallback
- Stripe Checkout, Customer Portal, verified webhooks, founding pricing, refunds, and reconciliation
- Supabase subscription, entitlement, founding-member, audit, event, and refund tracking
- FantasyNextMove Admin business dashboard
- Paid league limits and server-side feature enforcement
- Separate public `/demo` experience with real Dashboard and history routes restricted to All Access
- Existing complimentary beta access preservation

## Required after deployment

1. Run `COPY_PASTE_SQL_1.3D.sql` in Supabase SQL Editor.
2. Follow `BILLING_SETUP_1.3D.md` in Stripe Test mode.
3. Add the new Vercel variables listed in `.env.example`.
4. Redeploy Production.
5. Complete the Test-mode purchase and refund checklist before using live Stripe keys.
