-- US-394: fixes found by supabase/tests/rls/replayed/tenancy_matrix.test.sql,
-- which replays every migration into a scratch Postgres and probes each
-- company-scoped table as another tenant's admin.
--
-- Nothing here removes a row from anyone's own company. Sections 1 and 2
-- rewrite policies that fail at plan time into equivalent ones that do not.
-- Sections 3 to 6 add AS RESTRICTIVE policies (AND'd with the permissive
-- ones, so they only narrow), the same shape as 20260923170000: each one
-- admits the caller's company, root_admin, and rows whose company_id is NULL,
-- so the only access that goes away is to a row that names ANOTHER company.
-- The NULL branch is deliberate. It keeps every legacy row without a
-- company_id reachable exactly as before, which is what makes this safe in one
-- release; closing those rows is listed at the end for the owner.
--
-- Every statement is guarded on the table and columns existing, because the
-- live schema and the one the migrations build are known to differ
-- (US-248); the guarded parts no-op where the shape is not there.

-- 1. user_profiles "Users can view own profile and company members"
--    (20251203234846) subqueries user_profiles from inside a user_profiles
--    policy. Postgres rejects that with "infinite recursion detected in policy
--    for relation user_profiles", so wherever it exists every authenticated
--    read of user_profiles - and of every table whose policy reads
--    user_profiles - errors. Same name, same three branches, with the caller's
--    company and role read through the SECURITY DEFINER helpers instead.
DROP POLICY IF EXISTS "Users can view own profile and company members" ON public.user_profiles;
CREATE POLICY "Users can view own profile and company members"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (site_id = public.current_site_id()
        AND company_id = public.get_user_company(auth.uid()))
    OR (site_id = public.current_site_id()
        AND public.get_user_role(auth.uid()) = 'root_admin'::public.user_role)
  );

-- 2. profiles "Users can view profiles in their company" (20250804005934,
--    20250804010126) has the same self-reference, and seventeen tables'
--    policies read profiles (safety_incidents, labor_rates,
--    project_cost_entries, security_incidents, ...), so all of them error the
--    same way. The caller's companies come from a definer function now; the
--    rows admitted are the same.
CREATE OR REPLACE FUNCTION public.caller_profile_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.caller_profile_company_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_profile_company_ids() TO authenticated, service_role;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL AND EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can view profiles in their company'
  ) THEN
    DROP POLICY "Users can view profiles in their company" ON public.profiles;
    -- TO authenticated: for anon the old subquery matched nothing either.
    CREATE POLICY "Users can view profiles in their company" ON public.profiles
      FOR SELECT TO authenticated
      USING (company_id IN (SELECT public.caller_profile_company_ids()));
  END IF;
END $$;

-- Helper for the restrictive pins below: true when the table has every column.
CREATE OR REPLACE FUNCTION pg_temp.has_columns(t text, cols text[]) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT to_regclass('public.' || t) IS NOT NULL
     AND (SELECT count(*) FROM pg_attribute
           WHERE attrelid = to_regclass('public.' || t) AND attname = ANY (cols)
             AND attnum > 0 AND NOT attisdropped) = cardinality(cols)
$$;

-- 3. geofences. "Admins can manage geofences" (20250202000013) and "Project
--    managers can manage geofences" (20250202000018-20) are FOR ALL with only a
--    role check, so any company's admin or project manager could read, edit,
--    delete or create another company's geofences; "Users can view geofences"
--    admits every row with no project_id. All client readers and writers
--    (src/hooks/useGeofenceMap.ts, useGPSTimeTracking.ts, useAutoClockInOut.ts)
--    filter or write company_id = their own company.
DO $$
BEGIN
  IF pg_temp.has_columns('geofences', ARRAY['company_id']) THEN
    DROP POLICY IF EXISTS geofences_company_boundary ON public.geofences;
    CREATE POLICY geofences_company_boundary ON public.geofences
      AS RESTRICTIVE FOR ALL TO authenticated, anon
      USING (company_id IS NULL
             OR company_id = public.get_user_company(auth.uid())
             OR public.get_user_role(auth.uid()) = 'root_admin'::public.user_role)
      WITH CHECK (company_id IS NULL
             OR company_id = public.get_user_company(auth.uid())
             OR public.get_user_role(auth.uid()) = 'root_admin'::public.user_role);
  END IF;
END $$;

-- 4. error_logs. 20260209000001 made SELECT and UPDATE "auth.uid() IS NOT
--    NULL", so every signed-in user could read every company's errors (user
--    emails, URLs, stack traces) and mark them resolved. The only reader is
--    /admin/error-logs (SecureRoute root_admin, admin): root_admin keeps the
--    whole table, a company admin keeps their company's rows and the
--    company-less ones. The writer (src/services/errorLoggingService.ts) sends
--    the caller's company_id or NULL, both of which pass.
DO $$
BEGIN
  IF pg_temp.has_columns('error_logs', ARRAY['company_id']) THEN
    DROP POLICY IF EXISTS error_logs_company_boundary ON public.error_logs;
    CREATE POLICY error_logs_company_boundary ON public.error_logs
      AS RESTRICTIVE FOR ALL TO authenticated, anon
      USING (company_id IS NULL
             OR company_id = public.get_user_company(auth.uid())
             OR public.get_user_role(auth.uid()) = 'root_admin'::public.user_role)
      WITH CHECK (company_id IS NULL
             OR company_id = public.get_user_company(auth.uid())
             OR public.get_user_role(auth.uid()) = 'root_admin'::public.user_role);
  END IF;
END $$;

-- 5. workflows. "Admins can view all workflows" (20250202000008) lets any
--    company's admin read every company's workflows. Templates stay readable
--    across companies ("Users can view template workflows", read by
--    src/hooks/useWorkflowAutomation.ts), so the SELECT pin admits
--    is_template rows; writes are pinned without that branch.
DO $$
DECLARE
  pin text := 'company_id IS NULL OR company_id = public.get_user_company(auth.uid())'
              ' OR public.get_user_role(auth.uid()) = ''root_admin''::public.user_role';
BEGIN
  IF pg_temp.has_columns('workflows', ARRAY['company_id', 'is_template']) THEN
    DROP POLICY IF EXISTS workflows_company_boundary_read ON public.workflows;
    DROP POLICY IF EXISTS workflows_company_boundary_insert ON public.workflows;
    DROP POLICY IF EXISTS workflows_company_boundary_update ON public.workflows;
    DROP POLICY IF EXISTS workflows_company_boundary_delete ON public.workflows;
    EXECUTE format('CREATE POLICY workflows_company_boundary_read ON public.workflows'
      ' AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (is_template IS TRUE OR %s)', pin);
    EXECUTE format('CREATE POLICY workflows_company_boundary_insert ON public.workflows'
      ' AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (%s)', pin);
    EXECUTE format('CREATE POLICY workflows_company_boundary_update ON public.workflows'
      ' AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (%s) WITH CHECK (%s)', pin, pin);
    EXECUTE format('CREATE POLICY workflows_company_boundary_delete ON public.workflows'
      ' AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (%s)', pin);
  END IF;
END $$;

-- 6. client_portal_access. "Users can manage client access" (20250202000023-26)
--    is FOR ALL USING (tenant_id IS NULL OR has_tenant_access(tenant_id)).
--    Nothing in src/ sets tenant_id on the rows ProjectClientAccess creates, so
--    that is every row: any signed-in user could read another company's
--    enrolments, access_token and password_hash included, and rewrite or
--    delete them. The pin keeps every path the app uses: staff of the row's
--    company, root_admin, the enrolled client themselves (the branches of
--    "Clients can read their own portal access", 20260903020000), and the
--    tenant path useClientPortalPro.ts reads by tenant_id.
DO $$
BEGIN
  IF pg_temp.has_columns('client_portal_access', ARRAY['company_id', 'tenant_id', 'user_id', 'client_email'])
     AND to_regprocedure('public.has_tenant_access(uuid)') IS NOT NULL THEN
    DROP POLICY IF EXISTS client_portal_access_company_boundary ON public.client_portal_access;
    CREATE POLICY client_portal_access_company_boundary ON public.client_portal_access
      AS RESTRICTIVE FOR ALL TO authenticated, anon
      USING (company_id IS NULL
             OR company_id = public.get_user_company(auth.uid())
             OR public.get_user_role(auth.uid()) = 'root_admin'::public.user_role
             OR user_id = auth.uid()
             OR lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
             OR (tenant_id IS NOT NULL AND public.has_tenant_access(tenant_id)))
      WITH CHECK (company_id IS NULL
             OR company_id = public.get_user_company(auth.uid())
             OR public.get_user_role(auth.uid()) = 'root_admin'::public.user_role
             OR user_id = auth.uid()
             OR lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
             OR (tenant_id IS NOT NULL AND public.has_tenant_access(tenant_id)));
  END IF;
END $$;

-- 7. leads: finish US-351 where 20260923050000 could not apply. That
--    migration creates "Company members can create leads" WITH CHECK
--    (company_id = ...), but leads as the migrations build it - and as
--    src/integrations/supabase/types.ts describes the live table - has no
--    company_id (20250202000000), so the CREATE POLICY errors and the whole
--    file rolls back, leaving "Anyone can create leads" TO anon open. Redo its
--    drops here. Where company_id exists this is a no-op beside 20260923050000;
--    where it does not, signed-in users keep direct INSERT (unchanged for
--    them) and anon loses it, which is exactly what US-351 shipped: the public
--    forms go through the service-role capture-lead, handle-demo-request and
--    handle-sales-contact functions.
DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
    IF pg_temp.has_columns('leads', ARRAY['company_id']) THEN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads'
                       AND policyname = 'Company members can create leads') THEN
        CREATE POLICY "Company members can create leads" ON public.leads
          FOR INSERT TO authenticated
          WITH CHECK (company_id = public.get_user_company(auth.uid()));
      END IF;
    ELSE
      DROP POLICY IF EXISTS "Signed-in users can create leads" ON public.leads;
      CREATE POLICY "Signed-in users can create leads" ON public.leads
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
  END IF;
  IF to_regclass('public.demo_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can create demo requests" ON public.demo_requests;
  END IF;
  IF to_regclass('public.sales_contact_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can create sales contacts" ON public.sales_contact_requests;
  END IF;
  IF to_regclass('public.calculator_leads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow public to insert leads" ON public.calculator_leads;
  END IF;
END $$;

-- LEFT FOR THE OWNER (each would remove access some shipped client may use,
-- so each is a multi-release change):
--   * error_logs, geofences, workflows, client_portal_access rows with
--     company_id IS NULL are still reachable through the permissive policies
--     above by any signed-in user. For client_portal_access that includes
--     access_token and password_hash. Backfill company_id, then drop the NULL
--     branch in a later release.
--   * A client_portal user carries the contractor's company_id, so every
--     policy that checks only company membership admits them to internal data
--     (projects, bank_accounts, journal entries, user_profiles, ...). The list
--     is pinned in supabase/tests/rls/replayed/_client_portal_baseline.sql.
--   * leads has no company_id, and "Admin and sales can manage leads" /
--     "Admin and sales can view all leads optimized" let any company's admin
--     or office_staff read and edit every lead.
