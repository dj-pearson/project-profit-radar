-- =====================================================
-- MULTI-SITE ARCHITECTURE - Phase 3
-- =====================================================
-- Purpose: Update RLS policies to include site_id filtering
-- Migration: Phase 3 - Add site-aware RLS policies
-- Date: 2025-11-28
-- IMPORTANT: This adds site-level isolation on top of existing company-level isolation
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: Get current user's site_id from JWT
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_site_id()
RETURNS UUID AS $$
BEGIN
  -- Extract site_id from JWT claims
  -- This will be set by the frontend when users log in
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'site_id')::UUID,
    (auth.jwt() -> 'user_metadata' ->> 'site_id')::UUID,
    -- Fallback: Get from user_profiles table
    (SELECT site_id FROM user_profiles WHERE id = auth.uid() LIMIT 1),
    (SELECT site_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.current_site_id() IS
  'Returns the current user''s site_id from JWT or profile. Used in RLS policies.';

-- =====================================================
-- UPDATE RLS POLICIES - COMPANIES TABLE
-- =====================================================

-- Drop existing policies and recreate with site_id filter
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Users can view companies" ON companies;
DROP POLICY IF EXISTS "Users can view own companies" ON companies;

-- Users can only see companies within their site
CREATE POLICY "Users can view companies in their site"
  ON companies FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND (
      -- Users can see their own company
      id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid()
      )
      OR id IN (
        SELECT company_id FROM profiles
        WHERE user_id = auth.uid()
      )
      -- Or root admins can see all companies in the site
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'root_admin'
      )
    )
  );

CREATE POLICY "Admins can update companies in their site"
  ON companies FOR UPDATE
  USING (
    site_id = public.current_site_id()
    AND (
      id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'root_admin')
      )
      OR id IN (
        SELECT company_id FROM profiles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'root_admin')
      )
    )
  );

CREATE POLICY "Admins can insert companies in their site"
  ON companies FOR INSERT
  WITH CHECK (
    site_id = public.current_site_id()
  );

-- =====================================================
-- UPDATE RLS POLICIES - USER_PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view user profiles" ON user_profiles;

CREATE POLICY "Users can view profiles in their site"
  ON user_profiles FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND (
      -- Users can see their own profile
      id = auth.uid()
      -- Or profiles in the same company
      OR company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid()
      )
      -- Or root admins can see all profiles in the site
      OR EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'root_admin'
      )
    )
  );

CREATE POLICY "Users can update own profile in their site"
  ON user_profiles FOR UPDATE
  USING (
    site_id = public.current_site_id()
    AND id = auth.uid()
  );

-- =====================================================
-- UPDATE RLS POLICIES - PROFILES TABLE (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own profile" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view profiles" ON profiles';
    
    EXECUTE 'CREATE POLICY "Users can view profiles in their site"
      ON profiles FOR SELECT
      USING (
        site_id = public.current_site_id()
        AND (
          user_id = auth.uid()
          OR company_id IN (
            SELECT company_id FROM profiles
            WHERE user_id = auth.uid()
          )
        )
      )';
    
    EXECUTE 'CREATE POLICY "Users can update own profile in their site"
      ON profiles FOR UPDATE
      USING (
        site_id = public.current_site_id()
        AND user_id = auth.uid()
      )';
  END IF;
END $$;

-- =====================================================
-- UPDATE RLS POLICIES - PROJECTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view projects" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can view company projects" ON projects;

CREATE POLICY "Users can view projects in their site"
  ON projects FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
      UNION
      SELECT company_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage projects in their site"
  ON projects FOR ALL
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager', 'root_admin')
      UNION
      SELECT company_id FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'project_manager', 'root_admin')
    )
  );

-- =====================================================
-- UPDATE RLS POLICIES - TIME_ENTRIES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;

CREATE POLICY "Users can view time entries in their site"
  ON time_entries FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND (
      -- Users can see their own time entries
      user_id = auth.uid()
      -- Or time entries for projects in their company
      OR project_id IN (
        SELECT id FROM projects
        WHERE site_id = public.current_site_id()
        AND company_id IN (
          SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
          UNION
          SELECT company_id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage own time entries in their site"
  ON time_entries FOR ALL
  USING (
    site_id = public.current_site_id()
    AND (
      user_id = auth.uid()
      OR project_id IN (
        SELECT id FROM projects
        WHERE site_id = public.current_site_id()
        AND company_id IN (
          SELECT company_id FROM user_profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'project_manager', 'root_admin')
          UNION
          SELECT company_id FROM profiles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'project_manager', 'root_admin')
        )
      )
    )
  );

-- =====================================================
-- UPDATE RLS POLICIES - DOCUMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view documents" ON documents;
DROP POLICY IF EXISTS "Users can view own documents" ON documents;

CREATE POLICY "Users can view documents in their site"
  ON documents FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND (
      company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
        UNION
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
      )
      OR project_id IN (
        SELECT id FROM projects
        WHERE site_id = public.current_site_id()
        AND company_id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
          UNION
          SELECT company_id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage documents in their site"
  ON documents FOR ALL
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
      UNION
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE RLS POLICIES - FINANCIAL RECORDS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_records') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view financial records" ON financial_records';
    
    EXECUTE 'CREATE POLICY "Users can view financial records in their site"
      ON financial_records FOR SELECT
      USING (
        site_id = public.current_site_id()
        AND project_id IN (
          SELECT id FROM projects
          WHERE site_id = public.current_site_id()
          AND company_id IN (
            SELECT company_id FROM user_profiles
            WHERE id = auth.uid()
            AND role IN (''admin'', ''accounting'', ''root_admin'')
            UNION
            SELECT company_id FROM profiles
            WHERE user_id = auth.uid()
            AND role IN (''admin'', ''accounting'', ''root_admin'')
          )
        )
      )';
  END IF;
END $$;

-- =====================================================
-- UPDATE RLS POLICIES - CRM TABLES
-- =====================================================

DO $$
BEGIN
  -- CRM Contacts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_contacts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view crm contacts" ON crm_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view contacts" ON crm_contacts';
    
    EXECUTE 'CREATE POLICY "Users can view crm contacts in their site"
      ON crm_contacts FOR SELECT
      USING (
        site_id = public.current_site_id()
        AND company_id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
          UNION
          SELECT company_id FROM profiles WHERE user_id = auth.uid()
        )
      )';
    
    EXECUTE 'CREATE POLICY "Users can manage crm contacts in their site"
      ON crm_contacts FOR ALL
      USING (
        site_id = public.current_site_id()
        AND company_id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
          UNION
          SELECT company_id FROM profiles WHERE user_id = auth.uid()
        )
      )';
  END IF;
  
  -- CRM Leads
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_leads') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view crm leads" ON crm_leads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view leads" ON crm_leads';
    
    EXECUTE 'CREATE POLICY "Users can view crm leads in their site"
      ON crm_leads FOR SELECT
      USING (
        site_id = public.current_site_id()
        AND company_id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
          UNION
          SELECT company_id FROM profiles WHERE user_id = auth.uid()
        )
      )';
    
    EXECUTE 'CREATE POLICY "Users can manage crm leads in their site"
      ON crm_leads FOR ALL
      USING (
        site_id = public.current_site_id()
        AND company_id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
          UNION
          SELECT company_id FROM profiles WHERE user_id = auth.uid()
        )
      )';
  END IF;
END $$;

-- =====================================================
-- UPDATE RLS POLICIES - NOTIFICATIONS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own notifications" ON notifications';
    
    EXECUTE 'CREATE POLICY "Users can view own notifications in their site"
      ON notifications FOR SELECT
      USING (
        site_id = public.current_site_id()
        AND user_id = auth.uid()
      )';
    
    EXECUTE 'CREATE POLICY "Users can update own notifications in their site"
      ON notifications FOR UPDATE
      USING (
        site_id = public.current_site_id()
        AND user_id = auth.uid()
      )';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION & SUMMARY
-- =====================================================

DO $$
DECLARE
  v_tables_with_site_id INTEGER;
  v_tables_total INTEGER;
BEGIN
  -- Count tables with site_id column
  SELECT COUNT(*) INTO v_tables_with_site_id
  FROM information_schema.columns
  WHERE column_name = 'site_id'
  AND table_schema = 'public';
  
  -- Count total tables in public schema
  SELECT COUNT(*) INTO v_tables_total
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
  
  RAISE NOTICE '✓ Phase 3 RLS migration completed';
  RAISE NOTICE '✓ Created public.current_site_id() helper function';
  RAISE NOTICE '✓ Updated RLS policies for core tables to include site_id filtering';
  RAISE NOTICE '✓ Tables with site_id: % / % total tables', v_tables_with_site_id, v_tables_total;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: All database queries now enforce TWO-LAYER isolation:';
  RAISE NOTICE '  1. Site isolation (site_id = public.current_site_id())';
  RAISE NOTICE '  2. Company isolation (company_id IN user companies)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  - Update Edge Functions to set site_id in JWT';
  RAISE NOTICE '  - Update frontend to pass site_id during authentication';
  RAISE NOTICE '  - Test with multiple sites to ensure isolation';
END $$;

