# Applying migrations to staging and production

US-248. Supersedes `repair-migrations.ps1` and `mark-applied.ps1`, which were a
one-time reconciliation and must never become part of a deploy.

## Why this exists

The remote migration history and the local files diverged badly enough to need a
193-entry hand-written reconciliation. Two PowerShell scripts did it from a
laptop:

| script | what it did |
|---|---|
| `repair-migrations.ps1` | marked 193 remote-only migrations as **reverted** |
| `mark-applied.ps1` | marked 345 local migrations as **applied**, without running them |

Reconciled against the tree on 2026-08-27:

- 345 marked-applied timestamps, **all** of which have a local file (no orphans)
- 193 reverted timestamps, **none** of which exist locally — consistent with
  "remote-only, not in local files"
- 60 local migrations appear in neither script: everything from
  `20251202220000_sso_pending_states.sql` onward, i.e. added after the
  reconciliation and applied normally

That reconciliation is internally consistent, which is the case for deleting the
scripts (AC2). What it does **not** establish is that the 345 were ever actually
executed against production — `migration repair --status applied` records history
without running SQL. If a table or column that a migration should have created is
missing in prod, that is where to look first.

## The rule

Migrations are applied by **one** path: a reviewed run of `supabase db push`
against staging, then production, from a clean checkout of the merge commit.

Never:

- `supabase migration repair` as part of a deploy. It edits history to match
  reality; a deploy should change reality to match history. It is a recovery
  tool and its use is an incident, not a step.
- Applying from a working tree with uncommitted changes. What ran must be
  identifiable from a commit.
- Editing a migration that has merged to `main` (CLAUDE.md: migrations are
  append-only history).

## Deploying

```bash
# 0. Clean checkout of exactly what merged.
git fetch origin main && git checkout --detach origin/main
git status --porcelain     # must be empty

# 1. What is pending? Run against STAGING first (US-247).
supabase link --project-ref "$STAGING_PROJECT_REF"
supabase migration list    # local vs remote, side by side

# 2. Apply to staging and check the app still works before touching prod.
supabase db push

# 3. Same against production, and read the list before pushing.
supabase link --project-ref "$PROD_PROJECT_REF"
supabase migration list
supabase db push
```

Stop and escalate if `migration list` shows a remote entry with no local file:
that is drift, and pushing on top of it makes the divergence worse. It is what
produced the 193-entry repair.

## Drift check

`scripts/check-migration-drift.sh` wraps `supabase migration list` and fails when
local and remote disagree. Run it after every deploy, and on a schedule once
credentials are available to CI (AC3). It needs `SUPABASE_ACCESS_TOKEN` and a
project ref, so it cannot run in a PR build from a fork.

```bash
SUPABASE_PROJECT_REF=<ref> bash scripts/check-migration-drift.sh
```

## Rollback

Migrations do not roll back. `docs/RUNBOOK_ROLLBACK.md` is the authoritative
procedure — the short version is that a bad migration is fixed by a new
migration, forward.
