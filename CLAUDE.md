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
- **Branches**: see the **Branching & Release** section below — `claude/*` and `feat/*` branch from `develop`, `hotfix/*` from `main`, never push directly to `main`/`develop`/`release/*`. Commits: Conventional Commits.

## Security (non-negotiable)

1. Secrets only via env (`.env`, Cloudflare/Supabase secrets) — never hardcoded.
2. Validate all inputs with Zod; sanitize HTML output with DOMPurify.
3. Every table has RLS; isolate by `company_id`.
4. Log critical actions to the audit trail.

## Roles

`admin` → `project_manager` → `field_supervisor` → `office_staff` → `accounting` → `client_portal`. Auth via Supabase + SSO (SAML/OAuth) + MFA.

## Deploy

Cloudflare Pages, build cmd `npm ci && npm run build` → `dist/`. Node 18+, npm 10.9.2. Domains: `brikly.net`, `brikly.pearsonperformance.workers.dev`. Cloudflare env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`. Edge-fn secrets in Supabase dashboard.

## Critical Rules

### Branch first, code second

Brikly has live users (iOS in the App Store, web on Cloudflare Pages, Supabase Postgres in production). Changes to the wrong branch can ship straight to those users or block a release queue. **Before writing or pushing any non-trivial code, I (Claude) must confirm the target branch with you.** A one-line check-in is enough — "this sounds like a feature → I'll branch `claude/<desc>-<id>` from `develop`, OK?".

Phrase → branch mapping I should default to:

| You say…                                                                             | I branch from | I branch to                       | Eventually merges into        |
|--------------------------------------------------------------------------------------|---------------|-----------------------------------|-------------------------------|
| "new feature", "build X", "add Y", "let's try…"                                      | `develop`     | `claude/<desc>-<id>` or `feat/x`  | `develop` (PR)                |
| "fix the bug in develop", "this isn't working in staging"                            | `develop`     | `fix/<desc>` or `claude/...`      | `develop` (PR)                |
| "prepare release", "cut a release", "1.2.0 candidate", "ready to submit to App Store"| `develop`     | `release/x.y.z`                   | `main` **and back** to `develop` |
| "production bug", "broken in prod", "hotfix", "users can't log in right now"         | `main`        | `hotfix/<desc>` or `hotfix/x.y.z+1` | `main` **and back** to `develop` |
| "web-only fix while iOS is in review"                                                | `main`        | `hotfix/<desc>` (web-only diff)   | `main` (then forward-port to `develop`) |
| Trivial doc/typo (`README`, comments)                                                | `develop`     | `claude/docs-<id>`                | `develop` (PR)                |

If your phrasing is ambiguous (e.g. "fix the import flow" — develop fix or prod hotfix?), I must ask before committing.

**Never do, regardless of what you ask:**
- Force-push `main`, `develop`, `release/*`, or `hotfix/*`.
- Push directly to `main`, `develop`, or `release/*` (always via PR).
- Merge `develop` straight into `main` (it has to go through a `release/*` or a hotfix; the integration branch is *not* a production candidate by itself).
- Skip the `release/* → develop` (or `hotfix/* → develop`) back-merge — that loses the fix on the next release.
- Delete branches matching `main`, `develop`, `release/*`, `hotfix/*`.
- Run `--no-verify` on commits/pushes (bypasses pre-commit and the security smoke tests).

## Branching & Release

### Branch model

| Branch / pattern              | Deploys to                                                                          | Purpose                                                                                                 |
|-------------------------------|-------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `main` (default, protected)   | Cloudflare Pages production (`brikly.net`); source of truth for App Store builds    | Production. Merge-only via PR from `release/*` or `hotfix/*`. Tag every merge `vX.Y.Z`.                 |
| `develop` (long-lived, protected) | Cloudflare Pages preview/staging; ad-hoc TestFlight internal builds via `ios-release.yml` | Integration branch. Feature/fix PRs land here first. Always green; safe to demo from.                   |
| `release/x.y.z`               | Cloudflare Pages preview; **App Store / TestFlight submission candidate** (run `ios-release.yml` from this branch) | Cut from `develop` when scope is frozen. Only stabilization commits (version bumps, copy fixes, blocking bugs). When App Store approves → PR into `main`, tag, then merge back into `develop`. |
| `hotfix/<desc>` or `hotfix/x.y.z+1` | Cloudflare Pages preview; web prod once merged; iOS hotfix build if needed   | Fast-path to prod that **skips queued features in `develop`**. Cut from `main`, fix, PR into `main`, tag, **then back-merge into `develop` and any open `release/*`**. |
| `feat/<desc>` / `claude/<desc>-<id>` | PR preview only                                                              | Feature work. Branch from `develop`, PR back to `develop`. Short-lived.                                 |
| `fix/<desc>`                  | PR preview only                                                                     | Non-urgent bug fixes against `develop`.                                                                 |

### Deploy surfaces in plain English

- **Cloudflare Pages**: `main` → production (`brikly.net`). Every other branch with an open PR → a CF Pages preview URL.
- **iOS / TestFlight / App Store**: `.github/workflows/ios-release.yml` is **manual dispatch only**. Run it from `release/x.y.z` for App Store candidates; from `develop` for TestFlight internal testing; from `hotfix/*` for a fast-path build. Set `app_version` to match the tag you intend to ship.
- **Supabase**: `supabase/migrations/*` are run against the production project tied to `main` (and against staging tied to `develop` if/when that's wired up — currently TODO, see Follow-ups). Migration files are append-only history; never rewrite a merged migration.

### Rules of thumb

- **Web-only change while iOS is in review.** Branch `hotfix/<desc>` from `main`, ship via PR → `main`. The iOS build pipeline is *manual* (`workflow_dispatch`), so `main` advancing doesn't kick off a store submission — you choose when to run `ios-release.yml`. Forward-port to `develop` and to the open `release/*` immediately after merge.
- **Native iOS change.** Must ride a `release/*` train (App Store review window applies). Schedule it; don't try to hotfix native code through `main`.
- **`develop` is broken.** Fix on a `fix/*` branch off `develop` and PR back. Do *not* hotfix through `main` — that branch should stay clean.
- **Picking up a hotfix in flight on `develop`.** As soon as `hotfix/*` merges to `main`, open a back-merge PR `main → develop`. If a `release/*` is open, also merge `hotfix/*` → `release/*`.
- **App Store version numbers.** Tag on `main` (e.g. `v1.2.0`) must match `CFBundleShortVersionString` baked into the `release/*` build.

### Release flow (happy path)

1. Cut `release/x.y.z` from `develop` when scope is frozen.
2. Stabilize on `release/x.y.z` (no new features). Run `ios-release.yml` from this branch to submit to TestFlight/App Store.
3. App Store approves → open PR `release/x.y.z → main`. Squash or merge-commit (don't rebase a shared branch).
4. After merge: tag `main` as `vx.y.z`, write release notes.
5. Open a back-merge PR `release/x.y.z → develop` so stabilization fixes flow back. Then delete `release/x.y.z`.

### Hotfix flow

1. Cut `hotfix/<desc>` from `main`.
2. Fix + tests. Run `ios-release.yml` from `hotfix/*` if iOS is affected.
3. PR `hotfix/* → main`. Merge, tag (`vx.y.z+1`).
4. Open a back-merge PR `hotfix/* → develop`. If a `release/*` is open, also `hotfix/* → release/*`. Delete `hotfix/*`.

### Branch protections

Enforced via GitHub Rulesets — see `.github/rulesets/` for the canonical JSON and apply runbook. Summary:

- `main`, `develop`, `release/*`, `hotfix/*`: no deletion, no force-push.
- `main`, `develop`, `release/*`: PR required to merge in (no direct commits). `hotfix/*` allows direct commits to the hotfix branch itself; the gate is the PR into `main`.
- `required_approving_review_count: 0` while solo (GitHub blocks self-approve, so requiring approvals would deadlock). Bump to `1` once a second reviewer joins — instructions in `.github/rulesets/README.md`.
- Repo-admin bypass (`actor_id: 5`) so you can override in genuine emergencies.

## Backward Compatibility (persistent state)

Brikly has three load-bearing persistent surfaces. Anything that lives across a deploy must follow the multi-release deprecation flow.

### Defined min-supported versions

Track these as constants in code (add if missing) so backward-compat checks are mechanical:

- `MIN_SUPPORTED_IOS_VERSION` — oldest iOS app build still in the wild. App Store users update lazily; assume **two prior minor versions** are still on customer devices until App Store Connect analytics say otherwise.
- `MIN_SUPPORTED_WEB_VERSION` — for the web app this is effectively "whatever is cached in browsers right now"; after a CF Pages deploy, plan for ~24h of mixed clients hitting the API.
- `MIN_SUPPORTED_API_VERSION` — if/when API versioning is introduced (currently unversioned at `api.brikly.net` — see Follow-ups). Until then, **every shape an older client still reads is load-bearing.**

Any shape (DB column, RPC argument, JSON field, file format) that a client at `MIN_SUPPORTED_*_VERSION` still reads or writes cannot be removed or narrowed in a single release.

### Database (Supabase Postgres + migrations)

**Always safe (single migration is fine):**
- `CREATE TABLE` (with RLS policies in the same migration).
- `ALTER TABLE … ADD COLUMN` with a default OR nullable.
- `CREATE INDEX CONCURRENTLY` (manual statement; avoid blocking inside a busy migration).
- Adding a new enum *value* at the end of the enum.
- Adding a new RPC / edge function.
- Widening a type (`varchar(50) → text`, tightening `NOT NULL → NULL`).
- Adding a new RLS policy that is strictly more permissive (additive).

**Never do in a single release** (must be split across ≥2 deploys):
- `DROP COLUMN`, `DROP TABLE`, `DROP TYPE`, `DROP FUNCTION`.
- `RENAME COLUMN` / `RENAME TABLE` (no client at `MIN_SUPPORTED_*` knows the new name yet).
- Tightening: `NULL → NOT NULL`, adding a `CHECK` that existing rows might fail, narrowing a type (`text → varchar(50)`, `bigint → int`).
- Changing column type in a way that requires a rewrite (`text → uuid`, etc.).
- Removing an enum value (Postgres can't remove enum values cleanly; treat as forbidden).
- Reducing an RPC's parameter list, renaming parameters, or changing return shape.
- Tightening an RLS policy (an older client may now get permission-denied with no UX path to recover).
- Rewriting/editing a migration file that has already merged to `main`. Migrations are append-only history.

**Multi-release deprecation flow:**

1. **Release N — add new shape, dual-write.**
   - Add new column/table/RPC/enum value alongside the old one.
   - Update writers to populate **both** old and new shapes.
   - Readers prefer new, fall back to old. Ship to App Store + web.

2. **Release N+1 — migrate readers, backfill.**
   - Once telemetry confirms App Store rollout ≥ `MIN_SUPPORTED_IOS_VERSION`, run a backfill migration to populate the new shape for historical rows.
   - Switch readers to require the new shape; keep writers dual-writing.

3. **Release N+M — retire old shape.**
   - Only when **all** clients at or above `MIN_SUPPORTED_*_VERSION` are on Release N+1, run the destructive migration (`DROP COLUMN`, etc.).
   - Stop dual-writing. Delete fallback reader code.

If you can't tell whether a client at `MIN_SUPPORTED_IOS_VERSION` has the new code yet, **the answer is "not yet"** — wait one more release.

### API / Edge functions (`supabase/functions/`)

The response envelope is `{ success, data?, error?, timestamp }` (see `Conventions`). Treat that envelope and the `data` shape per endpoint as a public contract for the iOS app.

**Always safe:**
- Adding a new endpoint / edge function.
- Adding a new **optional** field to a response or request body.
- Loosening a Zod input schema (`.required() → .optional()`).
- Adding a new role to the RBAC ladder *below* existing roles (additive).

**Never do in a single release:**
- Removing or renaming a field on a response that iOS at `MIN_SUPPORTED_IOS_VERSION` reads.
- Removing or renaming a request field that iOS at `MIN_SUPPORTED_IOS_VERSION` sends.
- Tightening a Zod input schema (`.optional() → .required()`, narrower regex/enum). An older client's request will start 400-ing.
- Changing HTTP status codes for the same logical outcome.
- Removing an RBAC role or changing what an existing role is allowed to do in a *more restrictive* direction.
- Changing the envelope (`success`, `data`, `error`, `timestamp`).

Same 3-step deprecation flow as DB: add new field/endpoint → migrate iOS to use it (ship through App Store) → retire old field in a later release once min-supported clients are past it.

### iOS app (Info.plist, on-device storage, deep links)

- **Bundle ID `com.brikly.app`** and the App Store record are permanent. Never change.
- **On-device storage** (Keychain keys, Core Data / SwiftData / UserDefaults keys): treat each key name as a contract. Renaming a key strands data on old devices. Same dual-write → migrate → retire flow as DB.
- **Deep-link / universal-link routes**: an older app build may already have a route registered. Add new routes freely; never remove a previously-shipped one within `MIN_SUPPORTED_IOS_VERSION`.
- **Push notification payload shape**: same rule — additive only.
- **Force-update screen**: if a backward-incompatible change is genuinely unavoidable, ship a "your app is out of date" gate **first** in a release the user is still capable of receiving, then bump `MIN_SUPPORTED_IOS_VERSION` to that release before doing the destructive change. (This force-update gate doesn't exist yet — see Follow-ups.)

## Known Gaps

Accessibility coverage low (see `docs/ACCESSIBILITY_COMPLIANCE_CHECKLIST.md`); test coverage target 60%+; mobile offline-sync queue needs hardening; bundle target <800KB gzipped.

---

*For deep reference: `docs/`, per-directory `AGENTS.md`.*
