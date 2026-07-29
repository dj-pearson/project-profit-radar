# Rollback Runbook — Brikly

**Status:** Authoritative. This is the single current rollback procedure. It supersedes the
SSH/self-hosted/single-tenant rollback docs now archived under
[`docs/archive/rollback/`](./archive/rollback/) (kept for historical reference only — **do not follow them**).

> **Why the old docs are wrong:** they describe SSH-ing into a self-hosted Docker/Supabase box
> and rolling back a `site_id` multi-tenant migration. Brikly's production topology is **Cloudflare
> Pages + hosted Supabase + `company_id`-scoped multi-tenancy**. There is no application server to SSH
> into, and the `site_id` rollback they describe is not part of the current schema.

---

## Current production topology

| Surface        | Where it runs                                              | Rollback lever                                    |
|----------------|-----------------------------------------------------------|---------------------------------------------------|
| Web app        | Cloudflare Pages, `main` → `brikly.net`                    | CF Pages deployment rollback / `git revert` on `main` |
| Edge functions | Supabase hosted (project `brikly`), `supabase/functions/` | Redeploy a previous version via `supabase functions deploy` |
| Database       | Supabase Postgres (project `brikly`)                       | Forward-only compensating migration (never rewrite history) |
| iOS app        | App Store (`com.brikly.app`), manual `ios-release.yml`     | Cannot un-ship; halt phased release / expedite a fix build |

Tenancy is by `company_id` (see the Roles / RLS sections of `CLAUDE.md`). Any doc that filters by
`site_id` or removes a `sites` table is describing an abandoned design.

---

## 1. Web (Cloudflare Pages)

Production is whatever commit is live on `main`. Two ways back:

### A. Instant: roll back to a previous CF Pages deployment (no rebuild)

Fastest option — reactivates an already-built deployment.

- **Dashboard:** Cloudflare → Pages → the Brikly project → **Deployments** → pick the last known-good
  deployment → **Rollback to this deployment**.
- **CLI (`wrangler`):**
  ```bash
  wrangler pages deployment list                     # find the last good deployment id
  wrangler pages deployment rollback <deployment-id> # or omit id to pick the previous one
  ```

### B. Durable: revert the offending commit on `main`

Rollback A is a pointer flip; the next push to `main` re-deploys the bad commit unless you also fix
source. Follow the branch rules in `CLAUDE.md` — **never force-push or commit directly to `main`**:

```bash
git checkout main && git pull
git revert <bad-sha>            # creates a new commit; opens a PR path, not a history rewrite
# open PR → main; merge triggers a fresh CF Pages production build
```

For a range: `git revert --no-commit <old>..<new>` then commit once. Tag the resulting `main` state.

> Plan for ~24h of mixed browser clients after any deploy (see "Backward Compatibility" in `CLAUDE.md`).

---

## 2. Edge functions (Supabase)

Edge functions deploy independently of the web build. To revert one:

```bash
# Redeploy the previous known-good source for a single function
git checkout <good-sha> -- supabase/functions/<name>
supabase functions deploy <name> --project-ref brikly
git checkout HEAD -- supabase/functions/<name>   # restore working tree if this was a spot-check
```

Or revert the commit that touched the function (§1.B) and redeploy from the reverted source. Prefer
reverting one function over a blanket redeploy so you don't ship unrelated in-flight changes.

**Auth/CORS note:** every function must keep its auth guard and scoped CORS (`scripts/check-edge-function-auth.mjs`
enforces this). A rollback that reintroduces `verify_jwt=false` on a guarded function will fail the pre-commit guard — that's intended.

---

## 3. Database migrations

Migrations are **append-only history** (`CLAUDE.md` → Backward Compatibility). You do **not** rewrite,
delete, or re-order a migration that has merged to `main`.

To undo a schema change, ship a **new compensating migration** forward:

```bash
# new file: supabase/migrations/<14-digit-timestamp>_revert_<thing>.sql
# It must itself be backward-compatible: additive/loosening only.
# e.g. to undo an accidental ADD COLUMN, DROP it only if NO deployed client reads it yet
# (single-release DROP is forbidden if a MIN_SUPPORTED_* client still reads the column —
#  see the multi-release deprecation flow in CLAUDE.md).
```

Never `SET NOT NULL`, `DROP COLUMN`, narrow a type, or tighten an RLS policy in the compensating
migration unless the destructive-change rules in `CLAUDE.md` are satisfied. Restoring from a full DB
dump is a last resort and requires the on-call DBA + a maintenance window; hosted Supabase PITR/backups
are the recovery path, not a committed `.sql` dump.

---

## 4. iOS app

An App Store build **cannot be recalled**. Options, in order:

1. **Phased release:** if the release is still in phased rollout, pause it in App Store Connect.
2. **Server-side mitigation:** disable the broken path via an edge-function change or feature flag so
   older builds degrade gracefully (respect `MIN_SUPPORTED_IOS_VERSION` — additive changes only).
3. **Expedited fix build:** run `.github/workflows/ios-release.yml` from a `hotfix/*` branch with a bumped
   build number and request expedited review.

Native rollbacks ride the release train — see the Branching & Release section of `CLAUDE.md`.

---

## Severity → action quick reference

| Situation                                   | First move                                              |
|---------------------------------------------|---------------------------------------------------------|
| Web prod broken by last deploy              | §1.A CF Pages deployment rollback (instant)             |
| Bad code needs to stay out                  | §1.B `git revert` on `main` via PR                      |
| One edge function misbehaving               | §2 redeploy previous version of that function           |
| Bad migration shipped                       | §3 forward compensating migration (never rewrite)       |
| iOS build broken in the wild                | §4 pause phased release + server-side mitigation        |
| Data corruption / needs point-in-time       | Page on-call DBA; Supabase PITR, not a committed dump   |

---

*Owner: platform on-call. Update this file (not the archived ones) whenever the deploy topology changes.*
