# Public hosting investigation and proposed cutover

Verified October 17, 2026. Read-only investigation; no DNS, domain assignment, production deployment, authentication setting, or webhook URL changed. This document is an uncommitted review artifact, not a deployment instruction already approved by the owner.

## Verified routing

- Vercel team `team-gentry1` owns the domain and authoritative DNS zone. Nameservers: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`. No registrar transfer or nameserver change is required.
- Apex A records: `172.66.3.26` (`rec_7e560310db919ef8379559fb`) and `162.159.143.30` (`rec_aa7ae0eb2107f37d4c25a3a2`), each TTL 60. These exactly match the active ChatGPT Sites custom domain targets.
- ChatGPT Sites project `appgprj_6a660672b3a0819187f0f1edc6afe2ae` lists `https://fantasynextmove.com` as its live URL. Its access policy is custom, allowing only the owner. Its custom domain and SSL status are active. This is the verified source of the ChatGPT login wall.
- Vercel project `fantasy-next-move` already has the apex assigned and verified, but its DNS configuration is misconfigured because of the two explicit A records above.
- Existing system-managed apex ALIAS: `032e6f18d761a2a4.vercel-dns-017.com`; wildcard ALIAS: `cname.vercel-dns-017.com.`. No explicit www DNS record or www project assignment is listed.
- Observed HTTPS apex response: Cloudflare HTTP 401. HTTPS www: Vercel HTTP 307 to `https://fantasynextmove.com/`. HTTP apex redirects to HTTPS; HTTP www redirects to HTTPS www. Therefore www ultimately reaches the same restricted site.
- Vercel holds unexpired auto-renewing certificates covering both `fantasynextmove.com` and `*.fantasynextmove.com`. Certificate coverage is not a substitute for post-cutover HTTPS verification.

## Production readiness

Current production: `dpl_8Z8SnLHSoQj42HuD4dF7nMcGiYfa`, READY, main commit `97d86b042d2a0e04344e28d301363ce7c8d5d34f`. Vercel protection is `all_except_custom_domains`, with password and trusted-IP protection disabled. Keep Preview protection enabled.

Authenticated Vercel fetches verified that the existing production application renders `/`, `/pricing`, `/signup`; `/account` leads to FantasyNextMove email/password login; `/api/account` returns HTTP 401 without an app session. These are HTTP/source checks, not completed customer signup acceptance.

The current production application is NOT approved for cutover as-is:

- Old Trade Lab/All Access pricing and founding offers differ from the approved single Pro offering at $7.99/month or $39.99/year.
- Purchase buttons remain visible although no production Stripe keys, price IDs, or webhook secret are configured. The application must present an honest unavailable/prelaunch state and reject production billing requests until billing is separately approved.
- The landing page shows hardcoded sample scores/rankings, and `/demo` contains fictional data. Remove those customer-facing examples for this launch requirement or isolate them behind an explicitly approved demo; never present them as actual account data.
- Production predates the staging security and billing fixes. Review and select the necessary security fixes into a narrowly scoped release candidate, rather than promote the entire unfinished staging branch.
- Production Supabase public URL matches the existing project. Service credentials are server-only. `NEXT_PUBLIC_SITE_URL` and `YAHOO_REDIRECT_URI` are sensitive and cannot be read back through the connector. Confirm/replace the site URL deliberately in the approved release; do not assume its value.
- No complete signup/confirmation/reset workflow has been performed with an authorized disposable inbox. No claim of full account readiness.

## Authentication and callbacks

Supabase currently has new-user signups enabled, email authentication enabled, email confirmation required, and anonymous sign-ins disabled. Social providers are disabled; there is no customer ChatGPT authentication requirement in the Vercel app.

Supabase Site URL is already `https://fantasynextmove.com`. Exact apex `/auth/confirm`, `/auth/callback`, and `/update-password` URLs are allowlisted. Keep the apex canonical and redirect www before starting auth so these production URLs can stay unchanged. Retain existing app session verification, server authorization and database RLS. Validate email templates and actual confirmation/reset links before cutover. The allowlist also contains older ChatGPT-site URLs; remove obsolete entries only after the rollback window closes and with an explicit scoped auth change. Do not broaden the allowlist to arbitrary origins.

Yahoo is a separate provider callback at `/api/yahoo/callback`; keep production Yahoo disabled. Any future provider activation requires independently checking its registered callback. No Yahoo configuration is required to make public marketing pages accessible.

## Proposed execution, requiring explicit owner approval

1. Prepare and test a minimal production-safe release in the existing project: current approved pricing; billing unavailable server-side and in the interface; no staging credentials, fixture data or unfinished tools presented publicly; preserved private-route authorization. Set production site origin to `https://fantasynextmove.com`. Test public pages and unauthenticated denial, plus authorized disposable signup, email confirmation, sign-in and reset.
2. Snapshot the full current DNS zone, project domain assignments, current production deployment, production configuration metadata and relevant auth URLs. Preserve all MX, Google/DKIM, Resend/SPF, CAA and verification records. Do not import/replace the entire DNS zone.
3. Obtain approval for the exact reviewed release, production deployment, DNS record changes and canonical redirect. No DNS cutover before the release is ready. Keep both existing hosting registrations during the rollback window.
4. Deploy only the approved release to Vercel production. Retain the current deployment as the Vercel rollback target. Verify the production custom-domain protection policy stays public while Preview stays protected.
5. Add `www.fantasynextmove.com` to the same existing project, redirecting with HTTP 308 to `https://fantasynextmove.com` while preserving path and query. Add an explicit www CNAME to Vercel's then-current project recommendation (`032e6f18d761a2a4.vercel-dns-017.com.` at review time).
6. Re-read the Vercel domain recommendation immediately before the write. Remove only the two explicit ChatGPT-target apex A records. Preserve the existing system-managed Vercel apex ALIAS and verify it resolves to the current Vercel recommendation. Do not add a competing apex A/CNAME or change nameservers.
7. Verify authoritative DNS and multiple public resolvers, valid TLS for apex/www, HTTP-to-HTTPS and www-to-apex redirects with path/query preserved, public `/`, `/pricing`, `/signup` without ChatGPT or Vercel login, and app-only authentication for private routes. Confirm production payment endpoints remain unavailable and no staging secret appears in browser assets. Observe errors and recheck an actual disposable-account flow after propagation.
8. Retain the old Sites custom-domain attachment until verification and the rollback window finish. Do not make the old restricted Site public as a substitute for hosting the commercial app.

## Rollback

For a Vercel application regression, roll back to `dpl_8Z8SnLHSoQj42HuD4dF7nMcGiYfa` and restore approved configuration changes from the secure snapshot. Do not roll back authentication by disabling authorization or RLS.

For a DNS/routing failure, restore the two original apex A records and restore/remove only the explicit www/domain changes introduced during cutover. Their recorded TTL is 60 seconds, but caches can take longer. Restoring the former apex destination also restores the existing ChatGPT login wall; it restores routing, not the desired public experience. A validated public maintenance release on Vercel is preferable for a content-only rollback. No database migrations, user deletions or Stripe live changes are needed for this hosting migration.

## Separate Stripe Preview transport

Vercel officially supports sending third-party webhooks to a protected deployment with `?x-vercel-protection-bypass=<secret>`. Leave the Preview protected, create a separately named revocable Stripe sandbox automation token, and store it only in Stripe's sandbox endpoint configuration. Do not publish the actual URL/token, reuse the CI token, or set `x-vercel-set-bypass-cookie` for webhook POSTs. The application must still validate raw-body Stripe signatures and reject live-mode events.

Important scope: Vercel automation tokens work on every deployment in the project; they are not path- or Preview-scoped credentials. Configuring the URL only on the sandbox endpoint does not narrow the token's capability. Approval must acknowledge that scope before generating or sharing a token. No token was generated or endpoint changed during this investigation.

Acceptance after approval: unsigned requests with transport authorization reach the handler and are rejected by signature validation; genuine sandbox deliveries receive successful handler responses and update only the correct user's sandbox entitlement; duplicate delivery is idempotent; ordinary visitors without a bypass token still encounter Preview protection. Do not expose the whole staging hostname as a domain exception. OPTIONS allowlisting does not solve Stripe POST delivery.
