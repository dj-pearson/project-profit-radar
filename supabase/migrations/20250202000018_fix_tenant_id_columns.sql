-- Fix: Add tenant_id columns to existing tables
-- Migration: 20250202000018
-- Description: Adds tenant_id to user_profiles and other tables that need multi-tenant support

-- =====================================================
-- ADD TENANT_ID TO USER_PROFILES
-- =====================================================

-- Add tenant_id column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

    -- Create index for tenant_id lookups
    CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);

    RAISE NOTICE 'Added tenant_id column to user_profiles';
  ELSE
    RAISE NOTICE 'tenant_id column already exists in user_profiles';
  END IF;
END $$;

-- =====================================================
-- ADD TENANT_ID TO PROJECTS IF NEEDED
-- =====================================================

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

-- =====================================================
-- ADD TENANT_ID TO OTHER CORE TABLES
-- =====================================================

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
-- ENSURE TENANTS TABLE HAS ALL REQUIRED COLUMNS
-- =====================================================

-- Add missing columns to tenants table if they don't exist
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
    ALTER TABLE tenants ADD COLUMN slug TEXT UNIQUE;
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
END $$;

-- =====================================================
-- CREATE DEFAULT TENANT IF NONE EXISTS
-- =====================================================

-- Insert a default tenant for existing data
DO $$
BEGIN
  -- Check if any tenants exist
  IF NOT EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
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
      'default',
      'professional',
      TRUE,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Created default tenant';
  ELSE
    RAISE NOTICE 'Tenants already exist, skipping default tenant creation';
  END IF;
END $$;

-- =====================================================
-- ASSIGN DEFAULT TENANT TO EXISTING RECORDS
-- =====================================================

-- Get the first tenant ID (or create one)
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get or create default tenant
  SELECT id INTO default_tenant_id FROM tenants ORDER BY created_at LIMIT 1;

  IF default_tenant_id IS NULL THEN
    INSERT INTO tenants (name, slug, plan_tier, is_active)
    VALUES ('Default Tenant', 'default', 'professional', TRUE)
    RETURNING id INTO default_tenant_id;
  END IF;

  -- Update user_profiles with NULL tenant_id
  UPDATE user_profiles
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;

  -- Update projects with NULL tenant_id
  UPDATE projects
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'tenant_id');

  -- Update companies with NULL tenant_id
  UPDATE companies
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tenant_id');

  -- Update time_entries with NULL tenant_id
  UPDATE time_entries
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'tenant_id');

  RAISE NOTICE 'Assigned default tenant % to existing records', default_tenant_id;
END $$;

-- =====================================================
-- MAKE TENANT_ID NOT NULL (AFTER ASSIGNING VALUES)
-- =====================================================

DO $$
BEGIN
  -- Make tenant_id NOT NULL in user_profiles
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'tenant_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE user_profiles
    ALTER COLUMN tenant_id SET NOT NULL;

    RAISE NOTICE 'Made user_profiles.tenant_id NOT NULL';
  END IF;
END $$;

-- =====================================================
-- FIX RLS POLICIES THAT REFERENCE TENANT_ID
-- =====================================================

-- Drop and recreate policies for gps_time_entries if they exist
DO $$
BEGIN
  -- Drop old policy if exists
  DROP POLICY IF EXISTS "Users can view their tenant's GPS entries" ON gps_time_entries;
  DROP POLICY IF EXISTS "Users can create GPS time entries" ON gps_time_entries;
  DROP POLICY IF EXISTS "Users can update their GPS entries" ON gps_time_entries;

  -- Create new policies
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
-- CREATE HELPER FUNCTION FOR TENANT ACCESS
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

COMMENT ON FUNCTION get_user_tenant_id() IS 'Returns the tenant_id for the current authenticated user';
COMMENT ON FUNCTION is_user_admin() IS 'Checks if the current user is an admin or root_admin';
COMMENT ON FUNCTION has_tenant_access(UUID) IS 'Checks if the current user has access to a specific tenant';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  tenant_count INTEGER;
  user_with_tenant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO user_with_tenant_count FROM user_profiles WHERE tenant_id IS NOT NULL;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Total tenants: %', tenant_count;
  RAISE NOTICE '  - Users with tenant_id: %', user_with_tenant_count;
END $$;
