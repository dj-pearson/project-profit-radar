-- Per-company unique document numbers, part 2 of 2 (US-332).
--
-- Drops the table-wide single-column UNIQUE constraints on
-- invoices.invoice_number and purchase_orders.po_number, now that
-- 20260923190001 has made each unique per company. Looked up by column rather
-- than by name, because two migrations define purchase_orders differently.
-- Removing a uniqueness constraint only loosens what is accepted.

DO $$
DECLARE
  t   record;
  con record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('invoices', 'invoice_number'),
      ('purchase_orders', 'po_number')
    ) AS v(tbl, col)
  LOOP
    IF to_regclass('public.' || t.tbl) IS NULL THEN
      CONTINUE;
    END IF;

    FOR con IN
      SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       WHERE c.conrelid = ('public.' || t.tbl)::regclass
         AND c.contype = 'u'
         AND array_length(c.conkey, 1) = 1
         AND a.attname = t.col
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t.tbl, con.conname);
      RAISE NOTICE 'US-332: % is now unique per company, not per table (dropped %)', t.tbl, con.conname;
    END LOOP;
  END LOOP;
END $$;
