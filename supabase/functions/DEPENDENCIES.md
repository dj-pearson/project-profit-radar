# Edge-function dependencies

`deno.json` names one version per dependency. It holds nothing but `imports`, so
the Deno runtime that the Supabase CLI hands it has no key it does not
understand: the explanation lives here instead.

`scripts/check-deno-imports.mjs` (pre-commit and CI) is what makes the map
binding. Every remote import under `supabase/functions/` must carry a full
`x.y.z` version, and every import of a package named in `deno.json` must use
exactly the specifier named there. To move a version, change it in `deno.json`
and in the imports; the guard fails until the two agree.

Functions import by full URL rather than by the aliases. Supabase's runtime
resolves those URLs directly, so the map is a declaration the guard checks
rather than the resolver, and no deploy depends on it being picked up.

## What this replaced

| Package | Was imported as | Now |
|---|---|---|
| `@supabase/supabase-js` | `esm.sh@2.50.3` (80), `npm:@2` (23), `esm.sh@2` (9), `esm.sh@2.39.3` (6), `esm.sh@2.49.1` (1), `esm.sh@2.39.0` (1) | `https://esm.sh/@supabase/supabase-js@2.50.3` |
| `std` | `0.168.0/http/server.ts` (91), `0.190.0/http/server.ts` (75) | `https://deno.land/std@0.190.0/...` |
| `zod` | `deno.land/x/zod@v3.22.4` (17), `npm:zod@3` (15) | `https://deno.land/x/zod@v3.22.4/mod.ts` |
| `stripe` | `esm.sh@14.21.0` (14), `npm:stripe@14` (5), `esm.sh@14.5.0` (1) | `https://esm.sh/stripe@14.21.0` |

Each target is the version the largest group of functions was already running in
production, so nothing here moves onto a version this codebase had not been
using.

Every std import across the tree was `{ serve }` from `http/server.ts`, at both
0.168.0 and 0.190.0, and `serve(handler)` is the same function in both. The five
`npm:stripe@14` functions construct the client exactly as the fourteen `esm.sh`
ones do, `new Stripe(key, { apiVersion: "2023-10-16" })`, with no `httpClient`
override and no Node built-ins.

## Why a version skew is a bug and not a preference

Deno keys module instances by resolved specifier. Two specifiers for one package
are two module graphs holding two sets of classes, so `instanceof` across them
is false.

`_shared/validation.ts` checked `error instanceof z.ZodError` against the
`npm:zod@3` copy. All nine of its callers built their schemas with the
`deno.land/x/zod@v3.22.4` copy: `setup-mfa`, `verify-mfa-setup`,
`verify-mfa-login`, `sso-manage`, `sso-saml-init`, `sso-oauth-init`,
`sso-ldap-auth`, `create-stripe-checkout` and `process-invoice-payment`, across
21 call sites. The check was false on every request, so `validateRequest`
returned its generic `'Invalid request format'` instead of the field-level
message, on MFA enrolment, MFA login, every SSO configuration endpoint and two
payment endpoints.

Nothing about that is visible in the source of either file. Both import `z`,
both use it correctly, and the type checker is satisfied because the two copies
are structurally identical.

`_shared/validate-body.ts` was not affected: it reads `result.error.errors` off
`safeParse` and never uses `instanceof`, which is the safer shape when a schema
crosses a module boundary.

## Two AI services, neither superseding the other

- `_shared/ai-service.ts` reads model configuration from the
  `ai_model_configurations` table, which is what the admin UI writes to. Used by
  `blog-ai`, `enhanced-blog-ai-fixed`, `ai-content-generator` and
  `blog-social-integration`.
- `_shared/ai-service-env.ts` reads it from Coolify team shared variables, with
  standard/lightweight task routing. Used by `test-ai-configuration`.

It was called `ai-service-v2.ts`, which reads as the one to reach for in new
work. It is not: picking it moves a feature off the DB-configured models the
admin UI manages. Renamed rather than merged, because the four DB-driven
functions are in production and the env-driven path is a real deployment mode.

## Deleted

`_shared/auth-helpers-single-tenant.ts`, whose only reference in the tree was
its own usage example.

It was not a different tenancy model despite the name: diffing it against
`auth-helpers.ts` shows the same `verifyCompanyAccess` with the same
`company_id` scoping. It was a stale fork, three changes behind: it still
imported `npm:@supabase/supabase-js@2`, and it was missing `safeErrorResponse`,
which US-242 added so that a 500 does not hand the client raw Postgres error
text naming schema, columns and constraints.

That is the hazard in a module named for a deployment model sitting beside the
real one (US-302). Anyone reading "single-tenant" picks it on the name, and
what they actually get is last quarter's copy without the fix.
