# Validating the US-277 foreign keys

`supabase/migrations/20260924200000_missing_foreign_keys.sql` adds up to 170 foreign keys on `company_id`, `project_id` and `client_id` as `NOT VALID`. From the moment it runs, every insert or update that points at a company, project or contact that doesn't exist is refused. Rows that were already orphaned stay exactly as they were: the migration never deletes or rewrites data, and neither does anything in this runbook.

A `NOT VALID` key still enforces new writes and still fires its `ON DELETE` action. What it doesn't do is let the planner assume the key holds for old rows, and `pg_constraint.convalidated` stays false. Validating is the second step, and it's yours to schedule.

## 1. Run the orphan report

Run this in the Supabase SQL editor for production, which connects as `postgres`. Don't run it through the API or as an app user: the counts go through `query_to_xml`, which runs as the caller, so RLS would hide other tenants' rows and every count would come back low.

It reports every `NOT VALID` single-column foreign key in `public`, not only the US-277 ones, so a key someone added by hand shows up too.

<!-- orphan-report:start -->
```sql
SELECT c.conrelid::regclass AS table_name,
       a.attname AS column_name,
       c.confrelid::regclass AS references_table,
       c.conname AS constraint_name,
       (xpath('/row/n/text()', query_to_xml(format(
          'SELECT count(*) AS n FROM %s t WHERE t.%I IS NOT NULL'
          ' AND NOT EXISTS (SELECT 1 FROM %s p WHERE p.%I = t.%I)',
          c.conrelid::regclass, a.attname, c.confrelid::regclass, fa.attname, a.attname),
        false, true, '')))[1]::text::bigint AS orphan_rows
  FROM pg_constraint c
  JOIN pg_attribute a  ON a.attrelid = c.conrelid  AND a.attnum = c.conkey[1]
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = c.confkey[1]
 WHERE c.contype = 'f'
   AND NOT c.convalidated
   AND c.connamespace = 'public'::regnamespace
   AND cardinality(c.conkey) = 1
 ORDER BY orphan_rows DESC, c.conrelid::regclass::text, a.attname;
```
<!-- orphan-report:end -->

Each count is a full scan of that table. On the current data sizes that's seconds, but run it off-peak.

## 2. Look at the orphans before deciding anything

For any row with `orphan_rows > 0`, list them. Substitute the table and column from the report:

```sql
SELECT t.*
  FROM public.<table_name> t
 WHERE t.<column_name> IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.<references_table> p WHERE p.id = t.<column_name>);
```

What to do with them is a data decision, not a schema one, and there's no default:

- **The right parent is knowable** (a row's `project_id` is gone but its `company_id` is fine, or the id was a typo): update the column to the correct id.
- **The column is nullable and the row is still useful unlinked:** set the column to `NULL`.
- **The row is junk** (test data, a half-written import): export it first (`\copy (...) TO 'orphans_<table>.csv' CSV HEADER`), keep the export, then delete it by primary key. Never by a `NOT EXISTS` predicate in a single statement you haven't just read the output of.
- **Money or audit rows** (`audit_logs`, `payment_applications`, `retention_items`, `subcontractor_payments`, `collection_items`, `recurring_invoices`, `estimate_versions`, `budget_*`, `labor_costs`): don't delete. Leave the key `NOT VALID` for that table and note why in the validation migration.

Log whatever you change to the audit trail (CLAUDE.md, Security rule 4).

## 3. Validate, in a later migration

Once a key's orphan count is zero, validate it in a new migration file, never by editing `20260924200000`. `VALIDATE CONSTRAINT` takes `SHARE UPDATE EXCLUSIVE`, which doesn't block reads or writes, and scans the table once.

This generates the statements for every key that is clean right now; paste its output into the new file:

```sql
SELECT format('ALTER TABLE %s VALIDATE CONSTRAINT %I;', c.conrelid::regclass, c.conname)
  FROM pg_constraint c
  JOIN pg_attribute a  ON a.attrelid = c.conrelid  AND a.attnum = c.conkey[1]
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = c.confkey[1]
 WHERE c.contype = 'f' AND NOT c.convalidated
   AND c.connamespace = 'public'::regnamespace AND cardinality(c.conkey) = 1
   AND (xpath('/row/n/text()', query_to_xml(format(
          'SELECT count(*) AS n FROM %s t WHERE t.%I IS NOT NULL'
          ' AND NOT EXISTS (SELECT 1 FROM %s p WHERE p.%I = t.%I)',
          c.conrelid::regclass, a.attname, c.confrelid::regclass, fa.attname, a.attname),
        false, true, '')))[1]::text::bigint = 0
 ORDER BY 1;
```

If a `VALIDATE` fails in the deploy, a new orphan slipped in between the report and the push (it can't come from app writes, which the key already refuses, so look for a manual or service-role bulk load). The failed migration rolls back cleanly; rerun step 1.

## What changes for the app

- Inserts and updates that name a missing company, project or contact now fail with `23503` (foreign_key_violation) instead of writing an orphan.
- Deleting a project that has budget lines, budget tracking, labour costs, payment applications, retention items, subcontractor payments or collection items now fails. That matches bills, estimates, change orders and journal entries, which already block it. The edge function returns its usual project-deletion error; archive the project instead.
- Deleting a project clears `project_id` on nullable operational rows (chat channels, activity feed, calendar events, predictions and similar) and removes rows whose `project_id` is `NOT NULL` (AI analyses, inspection schedules, trade conflicts and similar).
- Deleting a CRM contact clears `client_id` on projects, estimates, invoices and client portal access.
