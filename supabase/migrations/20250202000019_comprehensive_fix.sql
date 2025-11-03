-- Comprehensive Fix Migration
-- Migration: 20250202000019
-- Description: Fixes all missing columns and dependencies in the correct order

-- =====================================================
-- STEP 1: FIX AUDIT_LOGS TABLE
-- =====================================================

-- Add missing columns to audit_logs table
DO $$
BEGIN
  -- Add company_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN company_id UUID;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
    RAISE NOTICE 'Added company_id column to audit_logs';
  END IF;

  -- Add tenant_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
    RAISE NOTICE 'Added tenant_id column to audit_logs';
  END IF;

  -- Add user_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_id UUID;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    RAISE NOTICE 'Added user_id column to audit_logs';
  END IF;

  -- Add action_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'action_type'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN action_type TEXT;
    RAISE NOTICE 'Added action_type column to audit_logs';
  END IF;

  -- Add resource_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'resource_type'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN resource_type TEXT;
    RAISE NOTICE 'Added resource_type column to audit_logs';
  END IF;

  -- Add resource_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'resource_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN resource_id TEXT;
    RAISE NOTICE 'Added resource_id column to audit_logs';
  END IF;

  -- Add description if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'description'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column to audit_logs';
  END IF;

  -- Add metadata if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN metadata JSONB;
    RAISE NOTICE 'Added metadata column to audit_logs';
  END IF;
END $$;

-- =====================================================
-- STEP 2: TEMPORARILY DISABLE TRIGGERS
-- =====================================================

-- Disable all triggers on user_profiles temporarily
DO $$
BEGIN
  ALTER TABLE user_profiles DISABLE TRIGGER ALL;
  RAISE NOTICE 'Disabled all triggers on user_profiles';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'user_profiles table does not exist yet';
END $$;

-- Disable all triggers on projects temporarily
DO $$
BEGIN
  ALTER TABLE projects DISABLE TRIGGER ALL;
  RAISE NOTICE 'Disabled all triggers on projects';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'projects table does not exist yet';
END $$;

-- =====================================================
-- STEP 3: ENSURE TENANTS TABLE HAS ALL REQUIRED COLUMNS
-- =====================================================

DO $$
BEGIN
  -- Add domain column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'domain'
  ) THEN
    ALTER TABLE tenants ADD COLUMN domain TEXT;
    RAISE NOTICE 'Added domain column to tenants';
  END IF;

  -- Add slug column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'slug'
  ) THEN
    ALTER TABLE tenants ADD COLUMN slug TEXT;
    RAISE NOTICE 'Added slug column to tenants';
  END IF;

  -- Add plan_tier column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'plan_tier'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan_tier TEXT DEFAULT 'professional';
    RAISE NOTICE 'Added plan_tier column to tenants';
  END IF;

  -- Add is_active column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE tenants ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'Added is_active column to tenants';
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to tenants';
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to tenants';
  END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE DEFAULT TENANT IF NONE EXISTS
-- =====================================================

DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Check if any tenants exist
  SELECT id INTO default_tenant_id FROM tenants ORDER BY created_at LIMIT 1;

  IF default_tenant_id IS NULL THEN
    INSERT INTO tenants (
      name,
      slug,
      plan_tier,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      'Default Tenant',
      'default-' || substr(gen_random_uuid()::text, 1, 8),
      'professional',
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING id INTO default_tenant_id;

    RAISE NOTICE 'Created default tenant with ID: %', default_tenant_id;
  ELSE
    RAISE NOTICE 'Using existing tenant with ID: %', default_tenant_id;
  END IF;

  -- Store the default tenant ID for later use
  CREATE TEMP TABLE IF NOT EXISTS temp_default_tenant (id UUID);
  DELETE FROM temp_default_tenant;
  INSERT INTO temp_default_tenant VALUES (default_tenant_id);
END $$;

-- =====================================================
-- STEP 5: ADD TENANT_ID TO USER_PROFILES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);

    RAISE NOTICE 'Added tenant_id column to user_profiles';
  ELSE
    RAISE NOTICE 'tenant_id column already exists in user_profiles';
  END IF;
END $$;

-- =====================================================
-- STEP 6: ADD TENANT_ID TO OTHER CORE TABLES
-- =====================================================

-- Projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE projects
    ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);

    RAISE NOTICE 'Added tenant_id column to projects';
  END IF;
END $$;

-- Companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE companies
    ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);

    RAISE NOTICE 'Added tenant_id column to companies';
  END IF;
END $$;

-- Time entries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE time_entries
    ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);

    RAISE NOTICE 'Added tenant_id column to time_entries';
  END IF;
END $$;

-- =====================================================
-- STEP 7: ASSIGN DEFAULT TENANT TO EXISTING RECORDS
-- =====================================================

DO $$
DECLARE
  default_tenant_id UUID;
  updated_users INTEGER;
  updated_projects INTEGER;
  updated_companies INTEGER;
  updated_time_entries INTEGER;
BEGIN
  -- Get the default tenant ID
  SELECT id INTO default_tenant_id FROM temp_default_tenant;

  -- Update user_profiles with NULL tenant_id
  UPDATE user_profiles
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_users = ROW_COUNT;

  -- Update projects with NULL tenant_id
  UPDATE projects
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'tenant_id');
  GET DIAGNOSTICS updated_projects = ROW_COUNT;

  -- Update companies with NULL tenant_id
  UPDATE companies
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tenant_id');
  GET DIAGNOSTICS updated_companies = ROW_COUNT;

  -- Update time_entries with NULL tenant_id
  UPDATE time_entries
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'tenant_id');
  GET DIAGNOSTICS updated_time_entries = ROW_COUNT;

  RAISE NOTICE 'Assigned default tenant % to existing records:', default_tenant_id;
  RAISE NOTICE '  - Users: %', updated_users;
  RAISE NOTICE '  - Projects: %', updated_projects;
  RAISE NOTICE '  - Companies: %', updated_companies;
  RAISE NOTICE '  - Time Entries: %', updated_time_entries;
END $$;

-- =====================================================
-- STEP 8: RE-ENABLE TRIGGERS
-- =====================================================

-- Re-enable all triggers on user_profiles
DO $$
BEGIN
  ALTER TABLE user_profiles ENABLE TRIGGER ALL;
  RAISE NOTICE 'Re-enabled all triggers on user_profiles';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'user_profiles table does not exist';
END $$;

-- Re-enable all triggers on projects
DO $$
BEGIN
  ALTER TABLE projects ENABLE TRIGGER ALL;
  RAISE NOTICE 'Re-enabled all triggers on projects';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'projects table does not exist';
END $$;

-- =====================================================
-- STEP 9: MAKE TENANT_ID NOT NULL (OPTIONAL)
-- =====================================================

-- Uncomment this if you want to enforce tenant_id NOT NULL
/*
DO $$
BEGIN
  ALTER TABLE user_profiles ALTER COLUMN tenant_id SET NOT NULL;
  RAISE NOTICE 'Made user_profiles.tenant_id NOT NULL';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not set user_profiles.tenant_id to NOT NULL: %', SQLERRM;
END $$;
*/

-- =====================================================
-- STEP 10: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('root_admin', 'admin')
    FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has tenant access
CREATE OR REPLACE FUNCTION has_tenant_access(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id = auth.uid()
      AND (
        tenant_id = check_tenant_id OR
        role = 'root_admin'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 11: FIX RLS POLICIES THAT REFERENCE TENANT_ID
-- =====================================================

-- Drop and recreate policies for gps_time_entries if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their tenant's GPS entries" ON gps_time_entries;
  DROP POLICY IF EXISTS "Users can create GPS time entries" ON gps_time_entries;
  DROP POLICY IF EXISTS "Users can update their GPS entries" ON gps_time_entries;

  CREATE POLICY "Users can view their tenant's GPS entries"
    ON gps_time_entries FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND (
          user_profiles.tenant_id = gps_time_entries.tenant_id OR
          user_profiles.role IN ('root_admin', 'admin')
        )
      )
    );

  CREATE POLICY "Users can create GPS time entries"
    ON gps_time_entries FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.tenant_id = gps_time_entries.tenant_id
      )
    );

  CREATE POLICY "Users can update their GPS entries"
    ON gps_time_entries FOR UPDATE
    USING (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('root_admin', 'admin', 'project_manager')
        AND user_profiles.tenant_id = gps_time_entries.tenant_id
      )
    );

  RAISE NOTICE 'Fixed RLS policies for gps_time_entries';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table gps_time_entries does not exist yet, skipping policy fixes';
END $$;

-- Drop and recreate policies for geofences if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view geofences" ON geofences;
  DROP POLICY IF EXISTS "Project managers can manage geofences" ON geofences;

  CREATE POLICY "Users can view geofences"
    ON geofences FOR SELECT
    USING (
      project_id IS NULL OR
      EXISTS (
        SELECT 1 FROM gps_time_entries
        WHERE gps_time_entries.project_id = geofences.project_id
        AND gps_time_entries.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('root_admin', 'admin', 'project_manager')
      )
    );

  CREATE POLICY "Project managers can manage geofences"
    ON geofences FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('root_admin', 'admin', 'project_manager')
      )
    );

  RAISE NOTICE 'Fixed RLS policies for geofences';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table geofences does not exist yet, skipping policy fixes';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  tenant_count INTEGER;
  user_with_tenant_count INTEGER;
  audit_log_columns TEXT;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO user_with_tenant_count FROM user_profiles WHERE tenant_id IS NOT NULL;

  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO audit_log_columns
  FROM information_schema.columns
  WHERE table_name = 'audit_logs';

  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Total tenants: %', tenant_count;
  RAISE NOTICE 'Users with tenant_id: %', user_with_tenant_count;
  RAISE NOTICE 'Audit log columns: %', audit_log_columns;
END $$;

COMMENT ON FUNCTION get_user_tenant_id() IS 'Returns the tenant_id for the current authenticated user';
COMMENT ON FUNCTION is_user_admin() IS 'Checks if the current user is an admin or root_admin';
COMMENT ON FUNCTION has_tenant_access(UUID) IS 'Checks if the current user has access to a specific tenant';
