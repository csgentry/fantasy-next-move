# Architecture and data boundaries

Browser → Next.js proxy → authenticated route/action → account-owned Supabase rows or approved provider request → deterministic recommendation / trade / power engine → UI.

Supabase authentication is existing infrastructure. Premium access is checked by server proxy and entitlement helpers. RLS limits account-owned league/history access using auth.uid() plus entitlement checks. Profiles and entitlements are self-readable; billing mutation uses service credentials. Trigger RPC access was restricted. Cross-account API/browser testing is still required.

Yahoo credentials: AES-256-GCM ciphertext, per-credential random IV, encryption key derived from server FNM_COOKIE_SECRET. Reads require current authenticated user ID; browser cookie migration removed. Rotate key with a credential migration/reconnect plan. No credential shown in UI or logs intentionally. Current code gates access until activation and contract review. Yahoo data cannot be persisted to league/history tables. Existing UI expects persistent leagues, so Yahoo onboarding is deliberately incomplete. Implement an authenticated request-scoped/session-in-memory retrieval flow with no durable provider payload or derived history before enabling it. Do not describe gate-only architecture as production Yahoo compliance.

Sleeper: existing public read-only imports, account-owned stored league payloads, weekly snapshots and deterministic scoring. Existing market proxy calls an external Tradyr feed; contractual rights, attribution, fallback quality and availability remain launch gates. No externally licensed rankings copied by this increment.

Proprietary settings, user preferences and entitlements are separate from Yahoo credentials. Core algorithms use no generative model. No Yahoo payload is sent to GA4 or an AI provider. Client event properties are discarded at collection. Existing internal events remain account-linked; define retention before launch. GA4 is not installed/verified by this increment.

Stripe: existing test-compatible REST requests, Checkout, Portal, signature verification, subscription sync and daily reconciliation code. Shared REST helper now rejects non-test keys. Existing webhook/deletion/reconciliation integration behavior is unverified against real Stripe events. No test transaction executed.

Health endpoint reports presence of public auth configuration only, never secret values. It is not a database or Yahoo readiness check. Exceptions and alerts need actual operational wiring. Existing two cron definitions do not prove deployed scheduled execution.
