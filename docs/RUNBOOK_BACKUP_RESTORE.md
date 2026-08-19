# Runbook: database backup and restore

How Brikly's production Postgres is backed up, and how to get it back.

Related: [`RUNBOOK_MIGRATIONS.md`](RUNBOOK_MIGRATIONS.md) for applying schema
changes, [`RUNBOOK_ROLLBACK.md`](RUNBOOK_ROLLBACK.md) for reverting a deploy,
[`RUNBOOK_DB_DUMP_INCIDENT.md`](RUNBOOK_DB_DUMP_INCIDENT.md) for the committed
dump incident.

## Status

**Not yet complete.** The tooling below exists; the parts that need a human have
not been done. Until every box is ticked, assume production is not recoverable.

- [ ] Supabase PITR or scheduled backups enabled, retention written down here
- [ ] `SUPABASE_PROD_DB_URL` and `BACKUP_ENCRYPTION_KEY` set as repository secrets
- [ ] The nightly workflow has completed successfully at least once
- [ ] A restore has actually been performed into a scratch project
- [x] Off-Supabase logical backup workflow (`.github/workflows/db-backup.yml`)
- [x] This runbook

## Two independent layers

**Supabase-managed** (primary). Point-in-time recovery or daily backups,
configured in the Supabase dashboard under Database -> Backups. This is what you
reach for in almost every real incident, because it can restore to a moment
rather than to last night. It also covers `auth`, `storage` and `pgsodium`,
which the logical dump deliberately does not.

Record the settings here once enabled:

| Setting | Value |
| --- | --- |
| Plan / tier | _to fill in_ |
| PITR enabled | _to fill in_ |
| Retention window | _to fill in_ |
| Backup region | _to fill in_ |

**Off-Supabase logical dump** (secondary). `.github/workflows/db-backup.yml`,
nightly at 02:23 UTC. `pg_dump --format=custom` over the `public` and
`extensions` schemas, verified, encrypted with GPG AES-256, kept as a 30-day
GitHub artifact and optionally copied to S3-compatible storage. This is the
layer that survives losing the Supabase account itself.

It excludes `auth`, `storage` and `pgsodium` on purpose. A dump carrying user
credentials, refresh tokens and encryption keys is what turned a backup into a
security incident (US-286) -- twice, since a second cluster dump was later found
still tracked under `backup/`. Restoring auth state is Supabase's job.

The consequence is worth stating plainly: **the logical backup alone cannot
restore a working system.** It restores application data into a project whose
auth users already exist. Supabase PITR is not optional.

## Setup

1. Enable PITR or scheduled backups in the Supabase dashboard. Fill in the table
   above.
2. Generate a strong passphrase and store it in the password manager, not here.
3. Add repository secrets: `SUPABASE_PROD_DB_URL`, `BACKUP_ENCRYPTION_KEY`.
4. Optional off-GitHub retention: `BACKUP_S3_BUCKET`,
   `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, and
   `BACKUP_S3_ENDPOINT` for R2/Backblaze.
5. Run the workflow manually once with `schema_only: true` to prove the
   connection works without moving customer data.
6. Then run it for real and do the test restore below.

If the passphrase is lost, every encrypted artifact is scrap. Losing it is
equivalent to having no off-Supabase backup at all.

## Test restore

Do this at least once, and again whenever the schema changes shape
significantly. An untested backup is a hypothesis.

1. Create a scratch Supabase project (or a local `supabase start`).
2. Download the newest `db-backup-*` artifact from the workflow run.
3. Decrypt:
   ```bash
   gpg --batch --quiet --passphrase-fd 0 --pinentry-mode loopback \
       --decrypt --output brikly.dump brikly-<stamp>.dump.gpg
   ```
4. Restore into the scratch database:
   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists \
              --dbname "$SCRATCH_DB_URL" brikly.dump
   ```
5. Check it landed. Row counts on the tables that matter, not just "no errors":
   ```bash
   psql "$SCRATCH_DB_URL" -c "
     SELECT 'projects', count(*) FROM projects
     UNION ALL SELECT 'invoices', count(*) FROM invoices
     UNION ALL SELECT 'time_entries', count(*) FROM time_entries
     UNION ALL SELECT 'daily_reports', count(*) FROM daily_reports;"
   ```
6. Confirm RLS survived -- a restore that drops policies is a data breach
   waiting to happen:
   ```bash
   psql "$SCRATCH_DB_URL" -c "
     SELECT count(*) FILTER (WHERE rowsecurity) AS rls_on,
            count(*) FILTER (WHERE NOT rowsecurity) AS rls_off
     FROM pg_tables WHERE schemaname = 'public';"
   ```
   Any table with `rowsecurity = false` needs explaining before you trust the
   restore.
7. Delete the scratch project and shred the decrypted dump.
8. Record the date and outcome in the log at the bottom of this file.

## Recovering production

**Decide which layer first.** Wrong data but a healthy database (bad migration,
bad bulk update, accidental delete) -> Supabase PITR, restoring to just before
the damage. Lost project or lost account -> new project, then the logical dump.

**PITR restore.** Supabase dashboard -> Database -> Backups -> Restore. Pick the
timestamp immediately before the damage. This replaces the database; anything
written after that point is gone, so capture what you need first. Tell users:
writes between the restore point and now will be lost.

**Logical restore into a fresh project.**

1. Create the project. Apply migrations via
   [`RUNBOOK_MIGRATIONS.md`](RUNBOOK_MIGRATIONS.md) so the schema exists.
2. Decrypt and `pg_restore` as in the test-restore steps, minus `--clean`.
3. Re-create auth users. The dump has none. Either restore auth from Supabase's
   own backup or, in a true disaster, force a password reset for everyone.
4. Re-point `SUPABASE_URL` / keys in Cloudflare Pages and Supabase secrets.
5. Rotate every key the old project held.
6. Verify RLS as above before letting traffic in.

## When the backup itself fails

The nightly job fails loudly rather than archiving a bad dump: it rejects
anything under 100KB, and any full dump carrying fewer than 50 tables of data.
That threshold exists because this story started with `backup_*.sql`
placeholders that were **zero bytes** and had been sitting there unnoticed.

A failing nightly is an incident, not a chore. A backup nobody checks is
indistinguishable from no backup.

## Never

- Commit a dump to the repository. That is what `.gitignore` and
  `scripts/check-no-tracked-cruft.sh` are for, and both have already been
  widened once after a dump slipped past them under `backup/`.
- Store the encryption passphrase in the repo, in CI logs, or in this file.
- Include `auth`, `storage` or `pgsodium` in a logical dump that leaves
  Supabase.
- Trust a backup you have not restored.

## Restore test log

| Date | Performed by | Artifact | Result |
| --- | --- | --- | --- |
| _none yet_ | | | **This is the open item that keeps US-246 from being done.** |
