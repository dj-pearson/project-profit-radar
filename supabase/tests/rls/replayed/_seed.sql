-- Shared world for the replayed/ tests (US-394), pulled in with \i.
--
-- Builds, as the service role with triggers and FK enforcement off:
--   * company A (aaaaaaaa-...-000000000000) and company B (bbbbbbbb-...),
--     both on one site so only the company boundary is under test;
--   * an admin in each: aaaaaaaa-...-0000000000a1 and bbbbbbbb-...-0000000000b1;
--   * rls_test.tables: every public table with a company_id column and RLS
--     enabled, read from the catalog;
--   * one row for A and one for B in each of those tables, or an entry in
--     rls_test.not_seeded saying why not;
-- and rls_test.probe(sql, b) to run one statement as the current JWT user
-- inside a rolled-back subtransaction.

CREATE SCHEMA rls_test;

-- Columns the generic values below cannot satisfy, because a CHECK spans two
-- columns or wants a format. expr is SQL; {tag} becomes 1, 2 or 3.
CREATE TABLE rls_test.seed_override (tbl text, col text, expr text NOT NULL, PRIMARY KEY (tbl, col));
INSERT INTO rls_test.seed_override VALUES
  ('fiscal_years', 'start_date', $$'2026-01-01'$$),
  ('fiscal_years', 'end_date', $$'2026-12-31'$$),
  ('fiscal_periods', 'start_date', $$'2026-01-01'$$),
  ('fiscal_periods', 'end_date', $$'2026-01-31'$$),
  ('journal_entry_lines', 'debit_amount', $$1$$),
  ('bank_reconciliation_items', 'bank_transaction_id', $$gen_random_uuid()$$),
  ('project_predictions', 'confidence_score', $$0.5$$),
  ('feature_flags', 'flag_key', $$'rls_test_flag_{tag}'$$),
  ('domain_verification_tokens', 'token', $$'brikly-verify=' || md5('{tag}')$$);

-- One SQL expression for a column, good enough to satisfy NOT NULL and the
-- common CHECK shapes. tag (1 or 2) keeps unique columns apart between A and B.
CREATE FUNCTION rls_test.value_for(rel regclass, att smallint, tag int) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  a pg_attribute; t pg_type; base oid; cat char; lit text; typ text;
BEGIN
  SELECT * INTO a FROM pg_attribute WHERE attrelid = rel AND attnum = att;
  typ := format_type(a.atttypid, a.atttypmod);
  -- A single-column CHECK listing allowed values: take the first.
  SELECT (regexp_match(pg_get_constraintdef(c.oid), '''((?:[^'']|'''')*)'''))[1] INTO lit
    FROM pg_constraint c
   WHERE c.conrelid = rel AND c.contype = 'c' AND c.conkey = ARRAY[att]
     AND pg_get_constraintdef(c.oid) ~ '(ANY \(\(?ARRAY\[|= '')'
   LIMIT 1;
  IF lit IS NOT NULL THEN RETURN quote_literal(replace(lit, '''''', '''')) || '::' || typ; END IF;

  base := a.atttypid;
  SELECT * INTO t FROM pg_type WHERE oid = base;
  WHILE t.typtype = 'd' LOOP base := t.typbasetype; SELECT * INTO t FROM pg_type WHERE oid = base; END LOOP;
  IF t.typtype = 'e' THEN
    RETURN quote_literal((SELECT enumlabel FROM pg_enum WHERE enumtypid = base ORDER BY enumsortorder LIMIT 1)) || '::' || typ;
  END IF;
  cat := t.typcategory;
  RETURN CASE
    WHEN cat = 'A' THEN '''{}''::' || typ
    WHEN base = 'uuid'::regtype THEN 'gen_random_uuid()'
    WHEN base IN ('json'::regtype, 'jsonb'::regtype) THEN '''{}''::' || typ
    WHEN cat = 'S' THEN quote_literal(left('s' || tag || '-' || a.attname,
                          CASE WHEN a.atttypmod > 4 THEN a.atttypmod - 4 ELSE 63 END)) || '::' || typ
    WHEN cat = 'N' THEN tag || '::' || typ
    WHEN cat = 'B' THEN 'false'
    WHEN cat = 'D' THEN 'now()::' || typ
    WHEN cat = 'T' THEN '''1 day''::' || typ
    WHEN cat = 'I' THEN '''10.0.0.' || tag || '''::' || typ
    WHEN base = 'tsvector'::regtype THEN '''''::tsvector'
    ELSE NULL
  END;
END $$;

-- INSERT statement for one row of rel. fixed maps column name to a value
-- (text, cast to the column's type); company_id and site_id are always
-- written, every other column only when NOT NULL without a default.
CREATE FUNCTION rls_test.insert_sql(rel regclass, tag int, fixed jsonb) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE cols text[] := '{}'; vals text[] := '{}'; r record; v text;
BEGIN
  FOR r IN
    SELECT a.attnum, a.attname, format_type(a.atttypid, a.atttypmod) AS typ, o.expr
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      LEFT JOIN rls_test.seed_override o ON o.tbl = c.relname AND o.col = a.attname
     WHERE a.attrelid = rel AND a.attnum > 0 AND NOT a.attisdropped
       AND a.attgenerated = '' AND a.attidentity <> 'a'
       AND (a.attname IN ('company_id', 'site_id')
            OR fixed ? a.attname OR o.expr IS NOT NULL
            OR (a.attnotnull AND NOT a.atthasdef AND a.attidentity = ''))
     ORDER BY a.attnum
  LOOP
    v := CASE WHEN fixed ? r.attname THEN quote_nullable(fixed ->> r.attname) || '::' || r.typ
              WHEN r.expr IS NOT NULL THEN '(' || replace(r.expr, '{tag}', tag::text) || ')::' || r.typ
              ELSE rls_test.value_for(rel, r.attnum, tag) END;
    IF v IS NULL THEN RAISE EXCEPTION 'no seed value for %.% (%)', rel, r.attname, r.typ; END IF;
    cols := cols || quote_ident(r.attname); vals := vals || v;
  END LOOP;
  RETURN format('INSERT INTO %s (%s) VALUES (%s)', rel, array_to_string(cols, ', '), array_to_string(vals, ', '));
END $$;

CREATE TABLE rls_test.tables (tbl regclass PRIMARY KEY, cid_type text NOT NULL);
CREATE TABLE rls_test.not_seeded (tbl regclass PRIMARY KEY, err text);
CREATE TABLE rls_test.results (tbl regclass, op text, outcome text, detail text);

INSERT INTO rls_test.tables
SELECT c.oid::regclass, format_type(a.atttypid, a.atttypmod)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'company_id' AND NOT a.attisdropped
 WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
   AND NOT c.relispartition;

-- Identities: companies A and B, each with an admin. Both share one site so
-- only the company boundary is under test.
SET session_replication_role = replica;
INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'a-admin@a.test', '{"provider": "email"}'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'b-admin@b.test', '{"provider": "email"}');
DO $$
DECLARE site text := '5e5e5e5e-0000-0000-0000-000000000000';
BEGIN
  IF to_regclass('public.sites') IS NOT NULL THEN
    EXECUTE rls_test.insert_sql('public.sites', 1, jsonb_build_object('id', site));
  END IF;
  EXECUTE rls_test.insert_sql('public.companies', 1, jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-000000000000', 'site_id', site));
  EXECUTE rls_test.insert_sql('public.companies', 2, jsonb_build_object('id', 'bbbbbbbb-0000-0000-0000-000000000000', 'site_id', site));
  EXECUTE rls_test.insert_sql('public.user_profiles', 1, jsonb_build_object(
    'id', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'email', 'a-admin@a.test', 'role', 'admin', 'is_active', 'true',
    'company_id', 'aaaaaaaa-0000-0000-0000-000000000000', 'site_id', site));
  EXECUTE rls_test.insert_sql('public.user_profiles', 2, jsonb_build_object(
    'id', 'bbbbbbbb-0000-0000-0000-0000000000b1', 'email', 'b-admin@b.test', 'role', 'admin', 'is_active', 'true',
    'company_id', 'bbbbbbbb-0000-0000-0000-000000000000', 'site_id', site));
END $$;

-- Seed one A row and one B row per table.
DO $$
DECLARE r record; site text := '5e5e5e5e-0000-0000-0000-000000000000';
BEGIN
  FOR r IN SELECT tbl FROM rls_test.tables WHERE tbl <> 'public.user_profiles'::regclass ORDER BY tbl::text LOOP
    BEGIN
      EXECUTE rls_test.insert_sql(r.tbl, 1, jsonb_build_object('company_id', 'aaaaaaaa-0000-0000-0000-000000000000', 'site_id', site));
      EXECUTE rls_test.insert_sql(r.tbl, 2, jsonb_build_object('company_id', 'bbbbbbbb-0000-0000-0000-000000000000', 'site_id', site));
    EXCEPTION WHEN others THEN
      INSERT INTO rls_test.not_seeded VALUES (r.tbl, SQLERRM);
    END;
  END LOOP;
END $$;
SET session_replication_role = origin;

-- Run every probe as company A's admin, each in its own subtransaction that is
-- rolled back afterwards so no probe sees another's effect.
--
-- Postgres checks RLS before NOT NULL, CHECK, unique and FK constraints, so a
-- write that fails on one of those got past RLS and counts as a leak. A
-- trigger, though, can fail before RLS is consulted (an audit trigger calling
-- a function that is missing here, say). A probe that errors any other way
-- than insufficient_privilege is therefore run again with triggers and FK
-- enforcement off - RLS still applies - and that answer is the one kept.
CREATE FUNCTION rls_test.probe_once(sql text, b text, no_triggers boolean, OUT outcome text, OUT detail text)
LANGUAGE plpgsql AS $$
DECLARE n bigint; got text;
BEGIN
  BEGIN
    IF no_triggers THEN SET LOCAL session_replication_role = replica; END IF;
    SET LOCAL ROLE authenticated;
    IF sql ~* '^\s*insert' THEN
      EXECUTE sql || ' RETURNING company_id::text' INTO got;
      n := CASE WHEN got = b THEN 1 ELSE 0 END;
    ELSIF sql ~* '^\s*select' THEN
      EXECUTE sql INTO n;
    ELSE
      EXECUTE sql; GET DIAGNOSTICS n = ROW_COUNT;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'ZZ394', MESSAGE = n::text;
  EXCEPTION
    WHEN SQLSTATE 'ZZ394' THEN
      outcome := CASE WHEN SQLERRM::bigint > 0 THEN 'LEAK' ELSE 'ok' END; detail := SQLERRM || ' row(s)';
    WHEN insufficient_privilege THEN
      outcome := 'ok'; detail := 'refused: ' || SQLERRM;
    WHEN not_null_violation OR check_violation OR unique_violation OR foreign_key_violation THEN
      outcome := CASE WHEN sql ~* '^\s*select' THEN 'error' ELSE 'LEAK' END;
      detail := 'passed RLS, then ' || SQLSTATE || ' ' || SQLERRM;
    WHEN others THEN
      outcome := 'error'; detail := SQLSTATE || ' ' || SQLERRM;
  END;
END $$;

CREATE FUNCTION rls_test.probe(sql text, b text, OUT outcome text, OUT detail text)
LANGUAGE plpgsql AS $$
BEGIN
  SELECT * INTO outcome, detail FROM rls_test.probe_once(sql, b, false);
  IF outcome = 'error' THEN
    SELECT * INTO outcome, detail FROM rls_test.probe_once(sql, b, true);
  END IF;
END $$;


-- The role tests build statements while acting as a user.
GRANT USAGE ON SCHEMA rls_test TO anon, authenticated;
GRANT SELECT ON rls_test.seed_override TO anon, authenticated;
