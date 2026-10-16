# Route inventory

| Route | Decision | Evidence / work remaining |
|---|---|---|
| `/account` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/admin` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/account/history` | Move to Later | Existing Sleeper persistence preserved; not a launch workflow |
| `/api/account/leagues` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/account/player-snapshots` | Simplify | Supporting data only; rights and end-to-end review outstanding |
| `/api/billing/checkout` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/billing/portal` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/billing/refund-request` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/billing/status` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/cron/billing-reconcile` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/cron/player-intelligence` | Simplify | Supporting data only; rights and end-to-end review outstanding |
| `/api/health` | Keep | Configuration-only health; database/provider health unverified |
| `/api/events` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/health` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/market/tradyr` | Simplify | Supporting data only; rights and end-to-end review outstanding |
| `/api/sleeper/history` | Move to Later | Existing Sleeper persistence preserved; not a launch workflow |
| `/api/sleeper/import` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/sleeper/intelligence` | Simplify | Supporting data only; rights and end-to-end review outstanding |
| `/api/sleeper/players` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/sleeper/power-data` | Simplify | Supporting data only; rights and end-to-end review outstanding |
| `/api/stripe/webhook` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/api/yahoo/callback` | Blocked | Keep disabled; contract execution, activation and ephemeral UI unverified |
| `/api/yahoo/connect` | Blocked | Keep disabled; contract execution, activation and ephemeral UI unverified |
| `/api/yahoo/disconnect` | Blocked | Keep disabled; contract execution, activation and ephemeral UI unverified |
| `/api/yahoo/history` | Remove | Historical experience removed from initial product |
| `/api/yahoo/import` | Blocked | Keep disabled; contract execution, activation and ephemeral UI unverified |
| `/api/yahoo/status` | Blocked | Keep disabled; contract execution, activation and ephemeral UI unverified |
| `/auth/callback` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/auth/confirm` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/billing/success` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/check-email` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/connect` | Simplify | Core workflow or marketing; source changed, integration checks incomplete |
| `/dashboard` | Simplify | Core workflow or marketing; source changed, integration checks incomplete |
| `/demo` | Simplify | Core workflow or marketing; source changed, integration checks incomplete |
| `/forgot-password` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/leagues` | Simplify | Core workflow or marketing; source changed, integration checks incomplete |
| `/login` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/` | Simplify | Core workflow or marketing; source changed, integration checks incomplete |
| `/pending` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/pricing` | Simplify | Core workflow or marketing; source changed, integration checks incomplete |
| `/privacy` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/record-book` | Remove | Historical experience removed from initial product |
| `/signup` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/team` | Simplify | Core workflow or marketing; source changed, integration checks incomplete |
| `/terms` | Keep | Account, operational or legal support; code exists, not full E2E verified |
| `/trade-lab` | Simplify | Core workflow or marketing; source changed, integration checks incomplete |
| `/update-password` | Keep | Account, operational or legal support; code exists, not full E2E verified |

Classification is source triage. “Keep” does not mean verified. Admin invitations remain for existing beta operations; no new enterprise admin built. Two cron definitions: player intelligence at 09:15 UTC, billing reconciliation at 09:45 UTC; scheduling and delivery unverified.
