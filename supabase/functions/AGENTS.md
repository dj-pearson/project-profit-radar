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
- **secure-cors.ts** - CORS header generation with origin allowlist.

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
