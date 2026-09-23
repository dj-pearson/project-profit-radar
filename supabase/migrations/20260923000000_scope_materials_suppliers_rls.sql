-- Scope materials, suppliers and material_suppliers to the caller's company (US-343).
--
-- 20250115000004_material_orchestration.sql created one FOR ALL policy on each
-- table whose whole predicate was
--
--   EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid())
--
-- which is "has any role row". 20251006204552 backfilled user_roles for every
-- user, so every signed-in user could read and write every company's materials,
-- suppliers and supplier pricing. The company-scoped policies added later are
-- permissive too, and permissive policies OR together, so they narrowed nothing.
--
-- What stays after this migration (all company_id = get_user_company(auth.uid())):
--   materials           "Users can view company materials"   SELECT (+ root_admin)
--                       "Admins can manage materials"        ALL, admin/PM/office_staff/root_admin
--                       "Company members can manage materials" ALL, added below
--   suppliers           "Users can manage company suppliers" ALL
--   material_suppliers  "material_suppliers_company_isolation" ALL
--
-- Why materials gets a replacement and the other two do not: suppliers and
-- material_suppliers already have a company-scoped FOR ALL that covers every
-- role. On materials the only company-scoped write policy is limited to four
-- roles, so dropping the bad policy alone would also stop a field_supervisor
-- from writing materials in THEIR OWN company. That is a same-tenant RLS
-- tightening, which CLAUDE.md does not allow in one release. The replacement
-- keeps same-company access exactly as it was for every role and removes only
-- the cross-company reach.
--
-- NULL company_id: company_id is NOT NULL on all three tables in the live
-- schema (src/integrations/supabase/types.ts Row types), so no row can be
-- stranded by a company predicate. The DO block still counts and reports any,
-- in case an environment differs from production.

DO $$
DECLARE
  t text;
  n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['materials', 'suppliers', 'material_suppliers'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE company_id IS NULL', t) INTO n;
      IF n > 0 THEN
        RAISE WARNING 'US-343: public.% has % row(s) with NULL company_id; they are now visible only to service_role', t, n;
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.materials') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can access company materials" ON public.materials;
    DROP POLICY IF EXISTS "Company members can manage materials" ON public.materials;
    CREATE POLICY "Company members can manage materials" ON public.materials
      FOR ALL
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()))
      WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF to_regclass('public.suppliers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can access company suppliers" ON public.suppliers;
  END IF;

  IF to_regclass('public.material_suppliers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can access material suppliers" ON public.material_suppliers;
  END IF;
END $$;
