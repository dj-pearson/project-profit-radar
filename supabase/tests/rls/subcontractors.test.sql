-- US-405: subcontractors, their insurance certificates and the private
-- subcontractor-documents bucket are company-scoped, hidden from client_portal,
-- and writable only by the office roles.

-- Storage shims: just the columns and helper the policies touch.
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean DEFAULT false);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text, name text, owner uuid
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects TO anon, authenticated, service_role;
-- Same result as Supabase's storage.foldername: every path segment but the file.
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

\i supabase/migrations/20260924110000_subcontractors.sql
-- Applying twice must be harmless.
\i supabase/migrations/20260924110000_subcontractors.sql

SELECT test_assert((SELECT public = false FROM storage.buckets WHERE id = 'subcontractor-documents'),
  'subcontractor-documents bucket is private');

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000f5'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1'), ('bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A Build'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B Build');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'office_staff'),
  ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000000', 'client_portal'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin');

INSERT INTO public.subcontractors (id, company_id, name, trade) VALUES
  ('aaaaaaaa-5555-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'A Electric', 'Electrical'),
  ('bbbbbbbb-5555-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', 'B Plumbing', 'Plumbing');
INSERT INTO public.subcontractor_insurance_certificates (company_id, subcontractor_id, coverage_type, file_path, expires_on) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-5555-0000-0000-000000000001', 'General Liability',
   'aaaaaaaa-0000-0000-0000-000000000000/aaaaaaaa-5555-0000-0000-000000000001/gl.pdf', '2027-01-01'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'bbbbbbbb-5555-0000-0000-000000000001', 'General Liability',
   'bbbbbbbb-0000-0000-0000-000000000000/bbbbbbbb-5555-0000-0000-000000000001/gl.pdf', '2027-01-01');
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('subcontractor-documents', 'aaaaaaaa-0000-0000-0000-000000000000/aaaaaaaa-5555-0000-0000-000000000001/gl.pdf'),
  ('subcontractor-documents', 'bbbbbbbb-0000-0000-0000-000000000000/bbbbbbbb-5555-0000-0000-000000000001/gl.pdf');

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

-- Office staff in company A: full use of their own list, nothing of B's.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert((SELECT count(*) FROM subcontractors) = 1, 'A office_staff reads only A subcontractors');
SELECT test_assert((SELECT count(*) FROM subcontractor_insurance_certificates) = 1, 'A office_staff reads only A certificates');
SELECT test_assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'subcontractor-documents') = 1, 'A office_staff reads only A certificate files');

INSERT INTO subcontractors (company_id, name, trade, prequalification)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'A Concrete', 'Concrete', '{"business_license": true}');
WITH u AS (UPDATE subcontractors SET rating = 4 WHERE name = 'A Concrete' RETURNING prequalification)
SELECT test_assert((SELECT prequalification->>'business_license' FROM u) = 'true', 'A office_staff adds, rates and prequalifies an A subcontractor');
WITH d AS (DELETE FROM subcontractors WHERE name = 'A Concrete' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM d) = 1, 'A office_staff deletes an A subcontractor');

WITH u AS (UPDATE subcontractors SET name = 'x' WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 0, 'A cannot update B subcontractors');
WITH d AS (DELETE FROM subcontractors WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM d) = 0, 'A cannot delete B subcontractors');
WITH d AS (DELETE FROM subcontractor_insurance_certificates WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM d) = 0, 'A cannot delete B certificates');
WITH d AS (DELETE FROM storage.objects WHERE name LIKE 'bbbbbbbb-%' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM d) = 0, 'A cannot delete B certificate files');
ROLLBACK;

-- Cross-tenant inserts raise.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(pg_temp.denied($$INSERT INTO subcontractors (company_id, name, trade) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'planted', 'Framing')$$),
  'A cannot insert a subcontractor into B');
SELECT test_assert(pg_temp.denied($$INSERT INTO subcontractor_insurance_certificates (company_id, subcontractor_id, coverage_type, file_path, expires_on) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'bbbbbbbb-5555-0000-0000-000000000001', 'GL', 'x', '2027-01-01')$$),
  'A cannot insert a certificate into B');
SELECT test_assert(pg_temp.denied($$INSERT INTO storage.objects (bucket_id, name) VALUES ('subcontractor-documents', 'bbbbbbbb-0000-0000-0000-000000000000/bbbbbbbb-5555-0000-0000-000000000001/planted.pdf')$$),
  'A cannot upload into B''s folder');
ROLLBACK;

-- An A certificate row cannot hang off B's subcontractor: the composite FK
-- refuses it even though the row's own company_id passes RLS.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
CREATE FUNCTION pg_temp.fk_refused() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO subcontractor_insurance_certificates (company_id, subcontractor_id, coverage_type, file_path, expires_on)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-5555-0000-0000-000000000001', 'GL', 'x', '2027-01-01');
  RETURN false;
EXCEPTION WHEN foreign_key_violation THEN
  RETURN true;
END $$;
SELECT test_assert(pg_temp.fk_refused(), 'a certificate cannot point at another company''s subcontractor');
ROLLBACK;

-- Office staff can upload into their own folder.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('subcontractor-documents', 'aaaaaaaa-0000-0000-0000-000000000000/aaaaaaaa-5555-0000-0000-000000000001/wc.pdf');
SELECT test_assert(true, 'A office_staff uploads into A''s folder');
ROLLBACK;

-- Field roles read the list but do not write it.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
SELECT test_assert((SELECT count(*) FROM subcontractors) = 1, 'a field_supervisor reads A subcontractors');
WITH u AS (UPDATE subcontractors SET rating = 1 RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 0, 'a field_supervisor cannot rate a subcontractor');
SELECT test_assert(pg_temp.denied($$INSERT INTO subcontractors (company_id, name, trade) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'field add', 'Framing')$$),
  'a field_supervisor cannot add a subcontractor');
ROLLBACK;

-- A customer on the portal sees none of it.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
SELECT test_assert((SELECT count(*) FROM subcontractors) = 0, 'client_portal reads no subcontractors');
SELECT test_assert((SELECT count(*) FROM subcontractor_insurance_certificates) = 0, 'client_portal reads no certificates');
SELECT test_assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'subcontractor-documents') = 0, 'client_portal reads no certificate files');
SELECT test_assert(pg_temp.denied($$INSERT INTO subcontractors (company_id, name, trade) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'portal add', 'Framing')$$),
  'client_portal cannot add a subcontractor');
ROLLBACK;

-- Anonymous callers see nothing.
BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert((SELECT count(*) FROM subcontractors) + (SELECT count(*) FROM subcontractor_insurance_certificates) = 0, 'anon reads nothing');
ROLLBACK;

-- The table rejects out-of-range ratings and non-object checklists.
CREATE FUNCTION pg_temp.check_refused(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN check_violation THEN
  RETURN true;
END $$;
SELECT test_assert(pg_temp.check_refused($$UPDATE subcontractors SET rating = 6$$), 'rating above 5 is refused');
SELECT test_assert(pg_temp.check_refused($$UPDATE subcontractors SET prequalification = '[]'$$), 'a non-object prequalification is refused');
