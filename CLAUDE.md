# Brikly — Construction Management Platform

B2B SaaS for SMB construction. React 19 + TypeScript + Vite, Supabase backend, Cloudflare Pages, Capacitor/Expo mobile, Stripe + QuickBooks integrations.

## Key Paths

- Supabase client/types: `src/integrations/supabase/{client,types}.ts`
- Auth: `src/contexts/AuthContext.tsx`, edge fn helpers `supabase/functions/_shared/auth-helpers.ts`
- UI primitives (shadcn): `src/components/ui/`
- Shared utils: `src/lib/`, `src/utils/`, types `src/types/`
- Edge functions: `supabase/functions/` (Deno) — migrations: `supabase/migrations/`
- E2E: `tests/e2e/` (Playwright) — unit: Vitest colocated

## Commands

```bash
npm run dev                    # port 8080
npm run build                  # prod build (build:analyze for bundle stats)
npm run lint
npm run test:run               # vitest
npm run test:coverage
npm run test:e2e               # playwright (:headed for visible)
npm run mobile:sync            # capacitor web → native
npm run mobile:run:{ios,android}
npm run expo:{start,build:ios,build:android}
```

## Conventions

- **Stack patterns**: TanStack Query for data; react-hook-form + Zod for forms; `sonner` toasts; `Skeleton` from `@/components/ui/skeleton` for loading; DOMPurify for output sanitization.
- **Edge function auth**: extract `Authorization` bearer → `supabaseClient.auth.getUser(token)` → enforce RBAC + `company_id` scoping.
- **API response shape**: `{ success, data?, error?, timestamp }`.
- **Naming**: Components `PascalCase`; hooks `useCamelCase`; utils `camelCase`; constants `UPPER_SNAKE_CASE`.
- **Branches**: `feature/`, `fix/`, `claude/<desc>-<sessionId>`. Commits: Conventional Commits.

## Security (non-negotiable)

1. Secrets only via env (`.env`, Cloudflare/Supabase secrets) — never hardcoded.
2. Validate all inputs with Zod; sanitize HTML output with DOMPurify.
3. Every table has RLS; isolate by `company_id`.
4. Log critical actions to the audit trail.

## Roles

`admin` → `project_manager` → `field_supervisor` → `office_staff` → `accounting` → `client_portal`. Auth via Supabase + SSO (SAML/OAuth) + MFA.

## Deploy

Cloudflare Pages, build cmd `npm ci && npm run build` → `dist/`. Node 18+, npm 10.9.2. Domains: `brikly.net`, `brikly.pearsonperformance.workers.dev`. Cloudflare env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`. Edge-fn secrets in Supabase dashboard.

## Known Gaps

Accessibility coverage low (see `docs/ACCESSIBILITY_COMPLIANCE_CHECKLIST.md`); test coverage target 60%+; mobile offline-sync queue needs hardening; bundle target <800KB gzipped.

---

*For deep reference: `docs/`, per-directory `AGENTS.md`.*
