# supabase/functions/ - Edge Functions (Deno Runtime)

## Purpose
Server-side API endpoints running on Supabase Edge Functions (Deno). 185+ functions covering payments, AI, analytics, blog, SEO, and automation.

## Conventions
- Each function lives in its own directory with an `index.ts` entry point.
- **Deno runtime** — use `npm:` prefix for npm imports (e.g., `import { createClient } from 'npm:@supabase/supabase-js@2'`).
- **CORS handling**: Every function must handle OPTIONS preflight. Use `_shared/secure-cors.ts`.
- **Auth pattern**: Use `_shared/auth-helpers.ts` for JWT validation:
  ```typescript
  import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
  const authContext = await initializeAuthContext(req);
  if (!authContext) return errorResponse('Unauthorized', 401);
  const { user, supabase } = authContext;
  ```

## Shared Utilities (`_shared/`)
- **auth-helpers.ts** - Auth context initialization, error/success response helpers.
- **secure-cors.ts** - CORS header generation with origin allowlist (use `getCorsHeaders(req)`, not wildcard `*`).
- **system-auth.ts** - `requireSystemOrAdmin(req)` guard for `verify_jwt=false` system/cron functions (accepts the `CRON_SECRET` header or an admin user).
- **entitlements.ts** - `checkEntitlement(...)` — authoritative server-side plan-limit enforcement (the client `checkLimit` is bypassable). Call before creating a gated resource.

## Auth & `verify_jwt` (US-198)
Supabase enforces a valid JWT for functions with `verify_jwt = true` (the
default). Functions set to `verify_jwt = false` in `config.toml` bypass that
check, so each MUST either:
- be genuinely public and verify its own caller (webhook signature, OAuth state,
  a dedicated secret), or
- apply a guard: `initializeAuthContext` (user), or `requireSystemOrAdmin`
  (cron/system functions), or a `withAuth` wrapper.

`scripts/check-edge-function-auth.mjs` (run in CI) classifies every
`verify_jwt=false` function as public / guarded / needs-guard, fails on a
regression of the `ENFORCED` set, and fails if any `ENFORCED` function ships
wildcard CORS. When you harden a backlog function, add it to `ENFORCED` in that
script. Current state: **0 backlog** — all 33 `verify_jwt=false` functions are
either allowlisted-public or guarded; all 20 non-public ones are `ENFORCED`.

**Canonical intentionally-public functions** (verify their own caller — webhook
signature, OAuth state, a dedicated secret, or a public marketing/tracking
endpoint): `stripe-webhook`, `gsc-oauth-callback`, `google-calendar-callback`,
`outlook-calendar-callback`, `webhook-verify`, `api-auth`, `create-root-admin`,
`email-unsubscribe`, `capture-lead`, `handle-demo-request`,
`handle-sales-contact`, `track-referral`, `process-referral-signup`. Everything
else that is `verify_jwt=false` MUST apply a guard.

**System/cron functions** use `requireSystemOrAdmin(req)` (CRON_SECRET header or
admin user; fails open only until `CRON_SECRET` is configured — set it and have
schedulers send `x-cron-secret` to enforce). NOTE: `process-dsar-fulfillment`
(GDPR deletion) never fails open — it additionally accepts the existing
service-role bearer and explicitly rejects when neither a service bearer nor
`CRON_SECRET`/admin is present.

**CORS**: never ship `Access-Control-Allow-Origin: '*'` on a non-public
function — use `getCorsHeaders(req)` from `secure-cors.ts` (declare
`const corsHeaders = getCorsHeaders(req)` as the first line of the handler).

## Function Categories
- **stripe-webhooks** - Payment processing via Stripe.
- **ai-*** - AI content generation, estimating, image analysis.
- **analytics-*** - Google Analytics OAuth, metrics.
- **blog-*** - AI blog generation, social integration.
- **calculate-*** - Bid analytics, health scores, lead scores, revenue.
- **api-auth / api-management** - Public API key auth and management.

## Pitfalls
- Environment secrets come from `Deno.env.get()`, not `import.meta.env`.
- Always return JSON with `{ success, data?, error?, timestamp }` format.
- Never expose internal errors to clients — return generic messages.
- Test functions locally with `supabase functions serve`.
