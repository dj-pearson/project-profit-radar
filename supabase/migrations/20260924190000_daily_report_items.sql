-- The daily report's materials and equipment become rows (US-330, AC3).
--
-- DECISION, recorded here and on the story: daily_report_material_items and
-- daily_report_equipment_items are WRITTEN, not deprecated. They have had the
-- right shape since 20251110000003 (quantity, unit, supplier, hours, condition)
-- and nothing ever wrote them. The free-text columns materials_delivered and
-- equipment_used stay and keep being written for at least one release, because
-- iOS at MIN_SUPPORTED_IOS_VERSION reads them. Readers prefer the rows and fall
-- back to the text.
--
-- WHY THE WRITES WOULD HAVE FAILED WITHOUT THIS FILE.
--
-- 1. site_id. 20251130000001 gave all four *_items tables a site_id column,
--    set it NOT NULL, and gave it no default. No writer supplies it: not the
--    web form, not sync_daily_report_crew (20260903190000), not iOS. So in any
--    environment matching the migrations every crew, task, material and
--    equipment row insert is a NOT NULL violation. daily_reports.site_id has
--    the same shape (20251128000002) and the web create form does not send it
--    either. The fill below is the one US-317 used for projects.site_id: a
--    BEFORE INSERT trigger that fills the column only when the caller left it
--    NULL, so a writer that sends it keeps its value. Attached only where the
--    column exists; the tenancy question itself is still US-275's.
--
-- 2. The policies. The only write policies on the *_items tables are
--    "Users can manage ... with site isolation" (20251130000001): site_id must
--    equal the JWT's app_metadata.site_id AND the report must have been created
--    by the caller. A superintendent correcting the crew on a report the PM
--    started is refused, and so is everybody whose JWT carries no site_id
--    claim. The policies here are company-scoped, the same test the rest of the
--    product uses, and additive: permissive policies OR together, so they only
--    ever grant.
--
-- 3. daily_reports.company_id. The web create form does not send it, so the
--    column is NULL on every web-filed report and anything scoping by it (the
--    reconciliation view, the photo backfill) had to go through projects. The
--    trigger fills it from the project when the caller leaves it NULL.
--
-- Additive throughout: new functions, new triggers that only fill NULLs, new
-- permissive policies. No drops, no tightening.

-- ---------------------------------------------------------------------------
-- 1. Which company a daily report belongs to
-- ---------------------------------------------------------------------------
-- Through the project, not daily_reports.company_id, which is NULL on every
-- report the web form filed before this migration. SECURITY DEFINER so the
-- *_items policies can call it without recursing through daily_reports RLS; it
-- returns a company id for a report id and nothing else.
CREATE OR REPLACE FUNCTION public.daily_report_company_id(p_daily_report_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.company_id
    FROM public.daily_reports dr
    JOIN public.projects p ON p.id = dr.project_id
   WHERE dr.id = p_daily_report_id;
$$;

COMMENT ON FUNCTION public.daily_report_company_id(uuid) IS
  'Company that owns a daily report, via its project. Used by the *_items RLS policies. US-330.';

REVOKE ALL ON FUNCTION public.daily_report_company_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.daily_report_company_id(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Fill what the writers leave out
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fill_daily_report_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id FROM public.projects p WHERE p.id = NEW.project_id;
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fill_daily_report_defaults() IS
  'Fills daily_reports.company_id from the project and created_by from the caller when the writer omits them. Only fills NULLs. US-330.';

-- site_id is filled by its own function, attached only where the column
-- exists: plpgsql resolves NEW.site_id when the trigger runs, so a function
-- naming it is harmless until it is attached to a table that has one.
CREATE OR REPLACE FUNCTION public.fill_daily_report_site_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.site_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT p.site_id INTO NEW.site_id FROM public.projects p WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fill_daily_report_site_id() IS
  'Fills daily_reports.site_id from the project when the writer omits it. Column is NOT NULL with no default and no writer sends it. US-330, same shape as US-317.';

CREATE OR REPLACE FUNCTION public.fill_daily_report_item_site_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.site_id IS NULL THEN
    SELECT dr.site_id INTO NEW.site_id FROM public.daily_reports dr WHERE dr.id = NEW.daily_report_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fill_daily_report_item_site_id() IS
  'Fills *_items.site_id from the parent daily report when the writer omits it. US-330.';

REVOKE ALL ON FUNCTION public.fill_daily_report_defaults() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fill_daily_report_site_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fill_daily_report_item_site_id() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_daily_report_defaults ON public.daily_reports;
CREATE TRIGGER trg_daily_report_defaults
  BEFORE INSERT ON public.daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_daily_report_defaults();

DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'daily_reports' AND column_name = 'site_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'site_id') THEN
    DROP TRIGGER IF EXISTS trg_daily_report_site_id ON public.daily_reports;
    -- Named to sort after trg_daily_report_defaults; triggers fire by name.
    CREATE TRIGGER trg_daily_report_site_id
      BEFORE INSERT ON public.daily_reports
      FOR EACH ROW
      EXECUTE FUNCTION public.fill_daily_report_site_id();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'daily_reports' AND column_name = 'site_id') THEN
    FOREACH t IN ARRAY ARRAY['daily_report_crew_items', 'daily_report_task_items',
                             'daily_report_material_items', 'daily_report_equipment_items'] LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = t AND column_name = 'site_id') THEN
        EXECUTE format('DROP TRIGGER IF EXISTS trg_item_site_id ON public.%I', t);
        EXECUTE format(
          'CREATE TRIGGER trg_item_site_id BEFORE INSERT ON public.%I '
          'FOR EACH ROW EXECUTE FUNCTION public.fill_daily_report_item_site_id()', t);
      END IF;
    END LOOP;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Company-scoped policies on the four *_items tables
-- ---------------------------------------------------------------------------
-- Read: anyone in the company, like the report itself. Write: the roles that
-- can file a daily report (the /daily-reports route and its RoleGuard), in the
-- report's company. client_portal, office_staff and accounting read nothing
-- new that they could not already read on the report.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['daily_report_crew_items', 'daily_report_task_items',
                           'daily_report_material_items', 'daily_report_equipment_items'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = t AND policyname = 'Company staff read report items') THEN
      EXECUTE format($p$
        CREATE POLICY "Company staff read report items" ON public.%I
          FOR SELECT TO authenticated
          USING (
            public.daily_report_company_id(daily_report_id) = public.get_user_company(auth.uid())
            AND public.get_user_role(auth.uid())::text <> 'client_portal'
          )
      $p$, t);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = t AND policyname = 'Field staff write report items') THEN
      EXECUTE format($p$
        CREATE POLICY "Field staff write report items" ON public.%I
          FOR ALL TO authenticated
          USING (
            public.daily_report_company_id(daily_report_id) = public.get_user_company(auth.uid())
            AND public.get_user_role(auth.uid())::text IN ('root_admin', 'admin', 'project_manager', 'field_supervisor')
          )
          WITH CHECK (
            public.daily_report_company_id(daily_report_id) = public.get_user_company(auth.uid())
            AND public.get_user_role(auth.uid())::text IN ('root_admin', 'admin', 'project_manager', 'field_supervisor')
          )
      $p$, t);
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE public.daily_report_material_items IS
  'Materials on a daily report, one row per line. Written by the web daily report from US-330; daily_reports.materials_delivered is dual-written for iOS.';
COMMENT ON TABLE public.daily_report_equipment_items IS
  'Equipment on a daily report, one row per machine. Written by the web daily report from US-330; daily_reports.equipment_used is dual-written for iOS.';
