-- =====================================================
-- DEFENSE-IN-DEPTH RLS POLICIES
-- =====================================================
-- Migration: 20260128000001
-- Purpose: Implement comprehensive RLS for 4-layer security
-- Date: 2026-01-28
--
-- Security Layers:
--   Layer 1: Authentication (Supabase Auth)
--   Layer 2: Authorization (Permissions in code)
--   Layer 3: Resource Ownership (this migration)
--   Layer 4: Database RLS (this migration)
--
-- CRITICAL: Final enforcement layer - even if application code
-- has bugs, these policies prevent unauthorized access
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id
    FROM public.user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is in a specific company
CREATE OR REPLACE FUNCTION public.user_in_company(check_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND company_id = check_company_id
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has admin/manager role
CREATE OR REPLACE FUNCTION public.user_is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('root_admin', 'admin', 'project_manager')
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has root_admin role
CREATE OR REPLACE FUNCTION public.user_is_root_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'root_admin'
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user owns a resource or is admin
CREATE OR REPLACE FUNCTION public.user_owns_or_admin(
  resource_created_by UUID,
  resource_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_user_company_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();

  SELECT company_id, role
  INTO v_user_company_id, v_user_role
  FROM public.user_profiles
  WHERE id = v_user_id AND is_active = TRUE;

  -- Root admin has access to everything
  IF v_user_role = 'root_admin' THEN
    RETURN TRUE;
  END IF;

  -- Must be in the same company
  IF v_user_company_id IS NULL OR v_user_company_id != resource_company_id THEN
    RETURN FALSE;
  END IF;

  -- Admins and managers can access all company resources
  IF v_user_role IN ('admin', 'project_manager') THEN
    RETURN TRUE;
  END IF;

  -- Others can only access their own resources
  RETURN resource_created_by = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- DROP EXISTING POLICIES (to recreate with better logic)
-- =====================================================

-- Drop existing policies if they exist (ignore errors)
DO $$
BEGIN
  -- Projects
  DROP POLICY IF EXISTS "Company isolation for projects" ON projects;
  DROP POLICY IF EXISTS "projects_company_isolation" ON projects;
  DROP POLICY IF EXISTS "projects_select" ON projects;
  DROP POLICY IF EXISTS "projects_insert" ON projects;
  DROP POLICY IF EXISTS "projects_update" ON projects;
  DROP POLICY IF EXISTS "projects_delete" ON projects;

  -- Invoices
  DROP POLICY IF EXISTS "Company isolation for invoices" ON invoices;
  DROP POLICY IF EXISTS "invoices_company_isolation" ON invoices;
  DROP POLICY IF EXISTS "invoices_select" ON invoices;
  DROP POLICY IF EXISTS "invoices_insert" ON invoices;
  DROP POLICY IF EXISTS "invoices_update" ON invoices;
  DROP POLICY IF EXISTS "invoices_delete" ON invoices;

  -- Time entries
  DROP POLICY IF EXISTS "Company isolation for time_entries" ON time_entries;
  DROP POLICY IF EXISTS "time_entries_company_isolation" ON time_entries;
  DROP POLICY IF EXISTS "time_entries_select" ON time_entries;
  DROP POLICY IF EXISTS "time_entries_insert" ON time_entries;
  DROP POLICY IF EXISTS "time_entries_update" ON time_entries;
  DROP POLICY IF EXISTS "time_entries_delete" ON time_entries;

  -- Expenses
  DROP POLICY IF EXISTS "Company isolation for expenses" ON expenses;
  DROP POLICY IF EXISTS "expenses_company_isolation" ON expenses;
  DROP POLICY IF EXISTS "expenses_select" ON expenses;
  DROP POLICY IF EXISTS "expenses_insert" ON expenses;
  DROP POLICY IF EXISTS "expenses_update" ON expenses;
  DROP POLICY IF EXISTS "expenses_delete" ON expenses;

  -- Documents
  DROP POLICY IF EXISTS "Company isolation for documents" ON documents;
  DROP POLICY IF EXISTS "documents_company_isolation" ON documents;
  DROP POLICY IF EXISTS "documents_select" ON documents;
  DROP POLICY IF EXISTS "documents_insert" ON documents;
  DROP POLICY IF EXISTS "documents_update" ON documents;
  DROP POLICY IF EXISTS "documents_delete" ON documents;

  -- Estimates
  DROP POLICY IF EXISTS "Company isolation for estimates" ON estimates;
  DROP POLICY IF EXISTS "estimates_company_isolation" ON estimates;
  DROP POLICY IF EXISTS "estimates_select" ON estimates;
  DROP POLICY IF EXISTS "estimates_insert" ON estimates;
  DROP POLICY IF EXISTS "estimates_update" ON estimates;
  DROP POLICY IF EXISTS "estimates_delete" ON estimates;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some policies may not exist: %', SQLERRM;
END $$;

-- =====================================================
-- PROJECTS TABLE RLS
-- =====================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view projects in their company
-- Managers/admins see all, others see only assigned
CREATE POLICY "projects_select" ON projects
  FOR SELECT
  USING (
    -- User must be in the same company
    user_in_company(company_id)
    AND (
      -- Admins and managers see all company projects
      user_is_admin_or_manager()
      OR
      -- Project managers can see their projects
      project_manager_id = auth.uid()
      OR
      -- Created by the user
      created_by = auth.uid()
      OR
      -- Root admin sees all
      user_is_root_admin()
    )
  );

-- INSERT: Only admins and managers can create projects
CREATE POLICY "projects_insert" ON projects
  FOR INSERT
  WITH CHECK (
    user_in_company(company_id)
    AND user_is_admin_or_manager()
  );

-- UPDATE: Can update if owner, PM, or admin
CREATE POLICY "projects_update" ON projects
  FOR UPDATE
  USING (
    user_in_company(company_id)
    AND (
      user_is_admin_or_manager()
      OR project_manager_id = auth.uid()
      OR created_by = auth.uid()
    )
  );

-- DELETE: Only admins can delete projects
CREATE POLICY "projects_delete" ON projects
  FOR DELETE
  USING (
    user_in_company(company_id)
    AND (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('root_admin', 'admin')
        AND is_active = TRUE
      )
    )
  );

-- =====================================================
-- INVOICES TABLE RLS
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- SELECT: Company members can view, with role-based filtering
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT
  USING (
    user_in_company(company_id)
    OR user_is_root_admin()
  );

-- INSERT: Admins, managers, accounting, office staff can create
CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT
  WITH CHECK (
    user_in_company(company_id)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('root_admin', 'admin', 'project_manager', 'accounting', 'office_staff')
      AND is_active = TRUE
    )
  );

-- UPDATE: Same as insert for updating
CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE
  USING (
    user_in_company(company_id)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('root_admin', 'admin', 'project_manager', 'accounting', 'office_staff')
      AND is_active = TRUE
    )
  );

-- DELETE: Only admins can delete invoices
CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE
  USING (
    user_in_company(company_id)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('root_admin', 'admin')
      AND is_active = TRUE
    )
  );

-- =====================================================
-- TIME_ENTRIES TABLE RLS
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries' AND table_schema = 'public') THEN
    ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- SELECT: Users see their own, managers see team's
CREATE POLICY "time_entries_select" ON time_entries
  FOR SELECT
  USING (
    user_in_company(company_id)
    AND (
      -- Own entries
      user_id = auth.uid()
      OR
      -- Admins/managers see all
      user_is_admin_or_manager()
      OR
      -- Root admin
      user_is_root_admin()
    )
  );

-- INSERT: Users can create their own entries
CREATE POLICY "time_entries_insert" ON time_entries
  FOR INSERT
  WITH CHECK (
    user_in_company(company_id)
    AND (
      -- Creating own entry
      user_id = auth.uid()
      OR
      -- Admins can create for others
      user_is_admin_or_manager()
    )
  );

-- UPDATE: Own entries or admin
CREATE POLICY "time_entries_update" ON time_entries
  FOR UPDATE
  USING (
    user_in_company(company_id)
    AND (
      user_id = auth.uid()
      OR user_is_admin_or_manager()
    )
  );

-- DELETE: Own entries or admin
CREATE POLICY "time_entries_delete" ON time_entries
  FOR DELETE
  USING (
    user_in_company(company_id)
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('root_admin', 'admin')
        AND is_active = TRUE
      )
    )
  );

-- =====================================================
-- EXPENSES TABLE RLS
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- SELECT: Users see their own, managers/accounting see all
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT
  USING (
    user_in_company(company_id)
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('root_admin', 'admin', 'project_manager', 'accounting')
        AND is_active = TRUE
      )
    )
  );

-- INSERT: Company members can create expenses
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT
  WITH CHECK (
    user_in_company(company_id)
  );

-- UPDATE: Own expenses or admin/accounting
CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE
  USING (
    user_in_company(company_id)
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('root_admin', 'admin', 'accounting')
        AND is_active = TRUE
      )
    )
  );

-- DELETE: Admin only
CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE
  USING (
    user_in_company(company_id)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('root_admin', 'admin')
      AND is_active = TRUE
    )
  );

-- =====================================================
-- DOCUMENTS TABLE RLS
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- SELECT: Company members can view documents
CREATE POLICY "documents_select" ON documents
  FOR SELECT
  USING (
    user_in_company(company_id)
    OR user_is_root_admin()
  );

-- INSERT: Company members can upload documents
CREATE POLICY "documents_insert" ON documents
  FOR INSERT
  WITH CHECK (
    user_in_company(company_id)
  );

-- UPDATE: Owner or admin
CREATE POLICY "documents_update" ON documents
  FOR UPDATE
  USING (
    user_in_company(company_id)
    AND (
      uploaded_by = auth.uid()
      OR user_is_admin_or_manager()
    )
  );

-- DELETE: Owner or admin
CREATE POLICY "documents_delete" ON documents
  FOR DELETE
  USING (
    user_in_company(company_id)
    AND (
      uploaded_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('root_admin', 'admin')
        AND is_active = TRUE
      )
    )
  );

-- =====================================================
-- ESTIMATES TABLE RLS
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimates' AND table_schema = 'public') THEN
    ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- SELECT: Company members can view
CREATE POLICY "estimates_select" ON estimates
  FOR SELECT
  USING (
    user_in_company(company_id)
    OR user_is_root_admin()
  );

-- INSERT: Admins, managers, office staff
CREATE POLICY "estimates_insert" ON estimates
  FOR INSERT
  WITH CHECK (
    user_in_company(company_id)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('root_admin', 'admin', 'project_manager', 'office_staff')
      AND is_active = TRUE
    )
  );

-- UPDATE: Creator or admin/manager
CREATE POLICY "estimates_update" ON estimates
  FOR UPDATE
  USING (
    user_in_company(company_id)
    AND (
      created_by = auth.uid()
      OR user_is_admin_or_manager()
    )
  );

-- DELETE: Admin only
CREATE POLICY "estimates_delete" ON estimates
  FOR DELETE
  USING (
    user_in_company(company_id)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('root_admin', 'admin')
      AND is_active = TRUE
    )
  );

-- =====================================================
-- CRM_CONTACTS TABLE RLS
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_contacts' AND table_schema = 'public') THEN
    ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "crm_contacts_select" ON crm_contacts
  FOR SELECT
  USING (
    user_in_company(company_id)
    OR user_is_root_admin()
  );

CREATE POLICY "crm_contacts_insert" ON crm_contacts
  FOR INSERT
  WITH CHECK (
    user_in_company(company_id)
  );

CREATE POLICY "crm_contacts_update" ON crm_contacts
  FOR UPDATE
  USING (
    user_in_company(company_id)
  );

CREATE POLICY "crm_contacts_delete" ON crm_contacts
  FOR DELETE
  USING (
    user_in_company(company_id)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('root_admin', 'admin', 'project_manager')
      AND is_active = TRUE
    )
  );

-- =====================================================
-- CRM_LEADS TABLE RLS
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_leads' AND table_schema = 'public') THEN
    ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "crm_leads_select" ON crm_leads
  FOR SELECT
  USING (
    user_in_company(company_id)
    OR user_is_root_admin()
  );

CREATE POLICY "crm_leads_insert" ON crm_leads
  FOR INSERT
  WITH CHECK (
    user_in_company(company_id)
  );

CREATE POLICY "crm_leads_update" ON crm_leads
  FOR UPDATE
  USING (
    user_in_company(company_id)
  );

CREATE POLICY "crm_leads_delete" ON crm_leads
  FOR DELETE
  USING (
    user_in_company(company_id)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('root_admin', 'admin', 'project_manager')
      AND is_active = TRUE
    )
  );

-- =====================================================
-- USER_PROFILES TABLE RLS (Special case - self access)
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see their own profile and company members
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT
  USING (
    -- Can see own profile
    id = auth.uid()
    OR
    -- Can see company members
    (company_id IS NOT NULL AND user_in_company(company_id))
    OR
    -- Root admin sees all
    user_is_root_admin()
  );

-- UPDATE: Users can only update their own profile
CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE
  USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Admins can update company members
    (
      company_id IS NOT NULL
      AND user_in_company(company_id)
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND role IN ('root_admin', 'admin')
        AND is_active = TRUE
      )
    )
  );

-- =====================================================
-- AUDIT_LOGS TABLE RLS (Read-only for users)
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- SELECT: Users can see their own audit logs, admins see company logs
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT
  USING (
    -- Own logs
    user_id = auth.uid()
    OR
    -- Admins see company logs
    (
      company_id IS NOT NULL
      AND user_in_company(company_id)
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('root_admin', 'admin')
        AND is_active = TRUE
      )
    )
    OR
    -- Root admin sees all
    user_is_root_admin()
  );

-- INSERT: System can insert (service role), or authenticated users for their actions
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT
  WITH CHECK (
    -- User creating their own log entry
    user_id = auth.uid()
    OR
    -- Service role can insert any
    auth.jwt() ->> 'role' = 'service_role'
  );

-- =====================================================
-- PERMISSION_AUDIT_LOG TABLE RLS
-- =====================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_log' AND table_schema = 'public') THEN
    ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "permission_audit_log_select" ON permission_audit_log
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR subject_user_id = auth.uid()
    OR (
      tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_users.tenant_id = permission_audit_log.tenant_id
        AND tenant_users.user_id = auth.uid()
        AND tenant_users.role IN ('owner', 'admin')
        AND tenant_users.is_active = TRUE
      )
    )
    OR user_is_root_admin()
  );

CREATE POLICY "permission_audit_log_insert" ON permission_audit_log
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- =====================================================
-- VERIFICATION & DEPLOYMENT
-- =====================================================

DO $$
DECLARE
  v_tables_checked INTEGER := 0;
  v_tables_secured INTEGER := 0;
  v_table RECORD;
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Defense-in-Depth RLS Migration Complete';
  RAISE NOTICE '=========================================';

  FOR v_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'projects', 'invoices', 'time_entries', 'expenses', 'documents',
      'estimates', 'crm_contacts', 'crm_leads', 'user_profiles',
      'audit_logs', 'permission_audit_log'
    )
  LOOP
    v_tables_checked := v_tables_checked + 1;

    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = v_table.tablename
    ) THEN
      v_tables_secured := v_tables_secured + 1;
      RAISE NOTICE 'Table % has RLS policies', v_table.tablename;
    ELSE
      RAISE WARNING 'Table % missing RLS policies!', v_table.tablename;
    END IF;
  END LOOP;

  RAISE NOTICE '-----------------------------------------';
  RAISE NOTICE 'Tables checked: %', v_tables_checked;
  RAISE NOTICE 'Tables with RLS: %', v_tables_secured;
  RAISE NOTICE '-----------------------------------------';
  RAISE NOTICE 'Security Layers Active:';
  RAISE NOTICE '  Layer 1: Authentication (Supabase Auth)';
  RAISE NOTICE '  Layer 2: Authorization (Application code)';
  RAISE NOTICE '  Layer 3: Resource Ownership (Helper functions)';
  RAISE NOTICE '  Layer 4: Database RLS (This migration)';
  RAISE NOTICE '=========================================';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_user_company_id() IS
  'Returns the company_id for the current authenticated user';

COMMENT ON FUNCTION user_in_company(UUID) IS
  'Checks if the current user belongs to the specified company';

COMMENT ON FUNCTION user_is_admin_or_manager() IS
  'Checks if the current user has admin or project_manager role';

COMMENT ON FUNCTION user_is_root_admin() IS
  'Checks if the current user has root_admin role';

COMMENT ON FUNCTION user_owns_or_admin(UUID, UUID) IS
  'Checks if user owns the resource or is an admin in the same company';
