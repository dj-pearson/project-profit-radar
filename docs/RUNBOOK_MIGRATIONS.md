# Runbook: applying database migrations

The single authoritative procedure for getting a Supabase migration from a
branch into staging and then production. Supersedes running `supabase db push`
or `supabase migration repair` from a laptop.

Related: [`RUNBOOK_ROLLBACK.md`](RUNBOOK_ROLLBACK.md) for undoing a bad deploy,
[`RUNBOOK_MONITORING.md`](RUNBOOK_MONITORING.md) for the health-check path.

## Why this exists

Migrations used to reach production by hand, and the repo carried the wreckage:
`repair-migrations.ps1` marked 193 remote-only versions as reverted, and
`mark-applied.ps1` marked 345 as applied, one `supabase migration repair` call
at a time. Both were one-off reconciliations of a history that had diverged so
far it could no longer be reasoned about, and neither recorded who ran what,
against which project, or when. A third, `rename-migrations.ps1`, bulk-renamed
migration files in place -- which for anything already merged is precisely the
append-only violation the guard below now blocks.

All three have been deleted. Re-running either repair script would blindly
overwrite the remote history and hide exactly the divergence you would be
trying to diagnose; the rename script has been obsolete since
`scripts/check-migration-filenames.sh` started enforcing the format. Their
timestamp lists live on in git history if a forensic question ever needs them.

## The rules

1. **Migrations are append-only.** Once a file merges to `main` it has run
   against production. Editing it means the database and the repo disagree
   permanently, because nothing will re-run it. Need a change? Write a new
   migration. `scripts/check-migration-drift.mjs` enforces this on every PR.
2. **Staging first.** Production applies are refused unless a `db-migrate` run
   has already succeeded on the same commit.
3. **`migration repair` is not a deploy step.** It rewrites the remote history
   table to match your assumptions. Reach for it only during a deliberate,
   documented reconciliation -- never to make a red pipeline go green.
4. **Never edit `supabase_migrations.schema_migrations` directly.**

## Prerequisites

Repository secrets:

| Secret | Purpose |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth |
| `SUPABASE_STAGING_DB_URL` | Staging Postgres connection string (US-247) |
| `SUPABASE_PROD_DB_URL` | Production Postgres connection string |

GitHub Environments:

- `staging-database` -- no reviewers needed.
- `production-database` -- **add at least one required reviewer.** This is the
  approval gate; without it a production apply proceeds unattended.

Until the staging secret exists the drift job reports "not configured" and
skips rather than failing, so the workflow is safe to merge ahead of US-247.

## Normal flow

1. **Write the migration** on your branch, named `<14-digit timestamp>_<slug>.sql`.
   Check it against the backward-compatibility rules in `CLAUDE.md` -- adding a
   nullable column is one release, renaming one is three.
2. **Open the PR.** `db-migrate` runs `integrity` (filenames, append-only
   history, duplicate timestamps) and `drift` (local files versus each remote
   history) automatically. Both must be green.
3. **Merge to `develop`.**
4. **Apply to staging.** Actions -> Database Migrations -> Run workflow, target
   `staging`, `dry_run: true`. Read the pending list in the run summary and
   confirm it is what you expect. Re-run with `dry_run: false`.
5. **Verify staging.** Exercise the affected feature against the staging
   project. This is the step that makes the whole pipeline worth having.
6. **Ship the code** through the normal `release/*` -> `main` flow.
7. **Apply to production.** Same workflow, target `production`, `dry_run: true`
   first. The run pauses for environment approval. Approve, then re-run with
   `dry_run: false`.
8. **Confirm.** The final step re-lists the remote history and fails if
   anything is still pending. The run summary is the audit record.

Order matters and depends on the change. Additive migrations (new table, new
nullable column) go **before** the code that reads them. Anything destructive
goes **after** every client at `MIN_SUPPORTED_*_VERSION` has stopped using the
old shape -- see the deprecation flow in `CLAUDE.md`.

## Reading the drift report

`supabase migration list` prints local and remote columns side by side.

- **Local version, no remote version** -- pending. Normal before an apply.
- **Remote version, no local file** -- real divergence. Something ran against
  the database that this repo cannot reproduce. The `drift` job fails here.
  **Do not apply and do not repair.** Find out what ran (dashboard SQL editor
  history, another branch, a teammate's laptop), then either commit the
  matching migration file or, if it genuinely should not exist, reconcile
  deliberately and record what you did in this runbook.
- **Both present** -- applied and in sync.

## When something goes wrong

**A push fails partway.** Postgres runs each migration in a transaction, so the
failing one rolls back; earlier ones in the same push stay applied. Fix the
failing file only if it has not merged yet. If it has, write a new migration.
Re-run the workflow -- `supabase db push` skips what is already recorded.

**A migration succeeded but the change was wrong.** Roll forward. Write a new
migration that corrects it. Never edit the original.

**The remote history has entries with no local file.** Stop and diagnose before
touching anything. Reconciling with `migration repair` is a deliberate,
reviewed act: capture the current `migration list` output, decide per version
whether it should be `applied` or `reverted`, record the reasoning here, then
run the repairs. It is not a routine step and never belongs in a script that
loops over hundreds of versions.

**You need to undo a deploy.** [`RUNBOOK_ROLLBACK.md`](RUNBOOK_ROLLBACK.md).

## Open dependencies

- **US-247** -- the staging project does not exist yet. Until it does, step 4
  cannot run and the production gate has nothing to check against, so a
  production apply is still effectively a first run. Treat this runbook as
  incomplete until the staging secret is set.
- **US-246** -- verified backups. Do not apply a destructive migration to
  production until a restore has actually been tested.
