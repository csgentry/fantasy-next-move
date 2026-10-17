# Priority reset — staging checkpoint, October 17, 2026

Release recommendation: **NOT READY**.

Remote baseline verified: 67fc9efe40970e54831c17873375f069b1f89f41. Main remains 97d86b042d2a0e04344e28d301363ce7c8d5d34f. PR #1 must remain open and unmerged. Production, production Yahoo and live billing are unchanged.

The workspace reconnect restored an earlier local checkpoint, not the unpublished 308a00b patch. Preserved that restored checkpoint on checkpoint-restored-workspace, aligned simplify-next-move with the verified remote baseline, then reconstructed and reverified the priority changes. Earlier validation of the missing patch does not establish acceptance of this reconstruction.

## Verified configuration

- PASS: existing Vercel team-gentry1 / fantasy-next-move accessible.
- PASS: original FantasyNextMove LLC merchant retained; existing sandbox product/prices preserved. USD 7.99 monthly / 39.99 annual.
- PASS: approved restricted sandbox API key and webhook signing secret exist in Vercel sensitive variables scoped only to simplify-next-move Preview. No credentials are in source.
- BLOCKED: Preview server database credential missing; webhook delivery encounters HTTP 401 from deployment protection. No application-level Checkout, entitlement activation, Portal, cancellation or reconciliation PASS is claimed.
- BLOCKED: EIN documentation mismatch remains external, awaiting official evidence or accepted alternative. Legal fields unchanged.

## Reconstructed code

- Yahoo discovery retrieves current-season owned-team metadata, without any roster retrieval. Selection validates key formats and rechecks ownership, then retrieves one selected owned roster. Removed all-team roster import, historical helper and userinfo/profile persistence.
- Yahoo fantasy information remains in request and React memory; account league saving rejects Yahoo; analytics and third-party market requests are suppressed for active Yahoo. History/snapshot persistence guards from previous staging work remain intact.
- Production Yahoo cannot be enabled. Preview needs all explicit approval/configuration flags. Response controls use no-store/no-referrer. Callback must match initiating Preview origin/path; refresh token rotation retained; transient token failure no longer deletes credentials. Errors exclude upstream payloads.
- Yahoo live activation, read-only permissions, OAuth, refresh, roster and disconnect remain BLOCKED on authorized Developer access/configuration and controlled Preview approval. Independent projections are not yet mapped; Trade Lab and league strength conclusions are withheld. No synthetic test is described as live verification. Text attribution is present; official logo/compliance acceptance remains outstanding.
- Next Move leads with the action and short reason; evidence expands on request. Duplicate team snapshot removed. My Team shows cleaner starter/bench rows, accurate empty-slot alignment and position-eligible lineup flags. Trade Lab uses You receive / You send, an explicit Analyze trade action, invalidated stale results and collapsed arithmetic. Account detail is collapsed. Five main navigation sections remain, with thumb-accessible mobile navigation.
- Unknown Stripe price cannot grant Pro from metadata. Signed live webhook events rejected. Subscription events retrieve canonical current state to reduce out-of-order regressions. Newer invoice subscription references supported.

## Acceptance evidence

- PASS: 36/36 local regression tests, TypeScript and clean build. Lint and HTTP smoke also PASS.
- NOT TESTED: redesigned deployed authenticated interactions and current mobile visual acceptance.
- BLOCKED: disposable signup/reset/deletion without an authorized inbox. Existing owner account must remain untouched.
- Historical real Sleeper discovery, correct ownership, roster, Next Move, league and hypothetical trade acceptance remain dated evidence. Changed flows need deployed regression.
- Publication uses approved native GitHub website upload because Git push lacks credentials and connector Git writes are denied. Additional VS Code OAuth repo/workflow/user/email grant was rejected by automatic approval review; no grant accepted. Only simplify-next-move is being updated.

## Focused competitive opportunities

Public FantasyPros feature categories cover My Playbook, Start/Sit, waivers, trades/finder, league analysis, Power Rankings and premium/mobile workflows. Keep our scope concentrated on three opportunities: one next action with optional evidence; clear trade construction with genuine roster fit; position-eligible lineup and waiver help inside existing sections. No proprietary rankings/designs copied. No DFS, betting, social, native app, new provider or major new feature category added. An independent quick calculator remains unaccepted until legitimate independent data is verified.

## Verified deployed checkpoint

Application tree fbc4a8b8f3d0652826b178c2b57f57cacb2ec0ab was published exactly as locally tested at remote commit be6913612701ffa821acfb434addf0b96612f117. Preview dpl_8bxokY9SkTsgGxPoZ7cR6saGeGy1 was Ready. Both Release quality runs passed: push 39003764267 and PR 39003768723. Their checks include lint, TypeScript, tests, build, HTTP smoke and Playwright; push also checks the protected deployed Preview. Automated public mobile checks do not establish authenticated mobile usability.

Authenticated desktop browser regression: player names loaded; You receive / You send selectors worked; Analyze trade produced a Poor Fit result with -4.9 projected lineup points for a hypothetical player swap; removing a selected player immediately cleared the verdict and disabled analysis. No trade was sent to Sleeper. Next Move showed one personalized primary action with a short reason, expandable evidence and one button. My Team rendered the correct saved owner roster with 9 starters, 11 bench and 4 taxi players, status text and one-decimal projections. Screenshots were inspected. This exposed duplicate roster-header copy, an unstyled team selector and repeated selected-trade metadata; subsequent small presentation fixes remove these. Authenticated mobile before/after remains NOT TESTED.

Supabase dashboard currently requires sign-in. Existing connector exposes publishable keys only, so the server credential cannot be provisioned through it. An approved secure sign-in and explicit authorization for the existing service credential to branch Preview remain necessary. No key was created or transferred. Webhook protection remains unchanged. Disposable inbox and live Yahoo authorization/configuration are still unavailable.

League desktop review also removed repeated row-level confidence and secondary rank labels, with evidence retained inside team details. It found that the separate Power Rankings lineup optimizer still allowed TE in an RB/WR flex slot; corrected both restricted FLEX aliases and added an end-to-end ranking regression. Final regression count: 37.
