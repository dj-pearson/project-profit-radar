# Runbook — Rollback (authoritative)

**This is the single source of truth for rolling back Brikly in production.**
It supersedes the ~17 sprawling `*_ROLLBACK_*` / `ROLLBACK_*` docs at the repo
root, most of which describe an **obsolete** architecture (SSH into a
self-hosted server, Supabase-in-Docker/Coolify, or a single-tenant teardown).
Those are banner-marked and listed under [Superseded docs](#superseded-docs).

## Current architecture (what you are actually rolling back)

| Surface | Reality | Rollback lever |
|---------|---------|----------------|
| **Frontend** | Cloudflare Pages. `main` → production (`brikly.net`); PR branches → preview URLs. Built with `npm ci && npm run build` → `dist/`. | Re-point Pages to a previous deployment, or revert `main` (CI redeploys). |
| **Edge functions** | Hosted Supabase (managed). Deployed with `supabase functions deploy`. **No version pinning** — rollback = redeploy the known-good source. | Redeploy the previous `supabase/functions/<name>/index.ts`. |
| **Database** | Hosted Supabase Postgres. Migrations in `supabase/migrations/*` are **append-only** and applied against the project tied to `main`. | Restore a pre-change backup, or apply a **new** compensating migration. Never rewrite a merged migration. |
| **Multi-tenancy** | Multi-tenant via `site_id` / `sites`. Do **not** follow any "revert to single-tenant" guide. | N/A — tenancy is not a rollback target. |

There is **no SSH box and no self-hosted/Docker Supabase.** Any doc that tells
you to `ssh root@<ip>` or `docker exec ... supabase-db` is obsolete — stop and
use this runbook instead.

---

## (a) Roll back a Cloudflare Pages (frontend) deployment

**Fastest — restore the previous deployment (no rebuild):**

```bash
wrangler pages deployment list --project-name brikly
wrangler pages deployment rollback           # promotes the prior deployment to production
```

**Redeploy from a known-good commit (when a rebuild is needed):**

```bash
git checkout main
git revert --no-edit <bad-commit>      # or: git reset --hard <good-commit> on a hotfix branch → PR
# CI rebuilds and republishes on push to main; or build + publish manually:
npm ci && npm run build
wrangler pages deploy dist --project-name brikly
```

Reverting `main` via a `hotfix/*` PR is the branch-safe path (see
`CLAUDE.md` → Branching & Release; never force-push or push straight to `main`).

## (b) Revert / redeploy a Supabase edge function

Edge functions are not version-pinned, so "rollback" = redeploy the corrected
source (restore the previous `index.ts` from git, then deploy).

```bash
# restore the good version of the source first, e.g.
git checkout <good-commit> -- supabase/functions/<name>/index.ts

# deploy a single function (preferred) or all of them
supabase functions deploy <name> --project-ref <YOUR_PRODUCTION_REF>
supabase functions deploy        --project-ref <YOUR_PRODUCTION_REF>   # all

# verify
supabase functions list
supabase functions logs <name>
```

Dashboard alternative: Supabase Dashboard → Edge Functions → select the
function → redeploy by pasting the good `supabase/functions/<name>/index.ts`;
set secrets under Settings → Edge Functions. Smoke-test with
`supabase.functions.invoke('<name>', { body: { ... } })`.

Optional local check before redeploying:

```bash
supabase start
supabase functions serve <name> --no-verify-jwt
```

## (c) Roll back a database migration

Migrations are **append-only history** — you never edit or delete a merged
migration. Roll back by restoring a backup or by shipping a new compensating
migration.

**Always snapshot before a risky migration:**

```bash
# Supabase Dashboard: Database → Backups → Create Backup, or:
supabase db dump -f backup_before_<change>_$(date +%Y%m%d).sql
```

**Restore the snapshot (full rollback):**

```bash
supabase db restore backup_before_<change>_YYYYMMDD.sql
```

**Or revert just the offending change with a new forward migration** — the
preferred path once other clients may depend on nearby rows (see the
Backward-Compatibility deprecation flow in `CLAUDE.md`). Example, reverting a
policy:

```sql
DROP POLICY "Public can view active sites" ON sites;
CREATE POLICY "Users can view active sites"
  ON sites FOR SELECT
  USING (is_active = TRUE);
```

Forward application in this stack: `supabase db push` (after `supabase link`),
verify with `supabase db diff`. A single migration file can be applied directly
with `psql "<production_connection_string>" -f supabase/migrations/<file>.sql`.

---

## Still-current reference docs

These remain accurate for the current stack and are linked from here rather
than duplicated:

- `DEPLOYMENT_CHECKLIST_RLS_FIX.md` — worked example of DB migration deploy **and** rollback (backup → restore → verify).
- `EDGE-FUNCTION-DEPLOYMENT.md` — deploying/debugging an edge function via the Supabase Dashboard.
- `DEPLOYMENT_GUIDE.md` — forward-deploy commands (migrations, edge functions, Pages).

## Superseded docs

> **Detecting an outage in the first place:** see `docs/RUNBOOK_MONITORING.md`
> for the uptime monitor + alerting that pages on-call when a dependency is down.

The following describe an obsolete architecture (SSH/self-hosted Supabase, or a
multi-tenant→single-tenant teardown) and must **not** be followed. Each now
carries a superseded banner pointing back here; they are kept only for
historical context:

`SSH_ROLLBACK_CHEATSHEET.md`, `ROLLBACK_VIA_SSH_GUIDE.md`,
`START_HERE_ROLLBACK.md`, `QUICK_ROLLBACK_REFERENCE.md`,
`MULTI_TENANT_ROLLBACK_GUIDE.md`, `ROLLBACK_PACKAGE_SUMMARY.md`,
`FRONTEND_ROLLBACK_CHECKLIST.md`, `EDGE_FUNCTIONS_ROLLBACK_SUMMARY.md`,
`scripts/README_ROLLBACK.md`.
