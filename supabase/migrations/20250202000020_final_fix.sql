-- Final Comprehensive Fix Migration
-- Migration: 20250202000020
-- Description: Fixes all missing columns without disabling triggers

-- =====================================================
-- STEP 1: FIX AUDIT_LOGS TABLE FIRST (BEFORE ANYTHING ELSE)
-- =====================================================

-- Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add all required columns to audit_logs table
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
    ALTER TABLE audit_logs ADD COLUMN tenant_id UUID;
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

  -- Add resource_id if missing or fix its type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'resource_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN resource_id TEXT;
    RAISE NOTICE 'Added resource_id column to audit_logs';
  ELSE
    -- Check if resource_id is UUID and change it to TEXT
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      AND column_name = 'resource_id'
      AND data_type = 'uuid'
    ) THEN
      -- First, convert existing UUID values to TEXT
      ALTER TABLE audit_logs ALTER COLUMN resource_id TYPE TEXT USING resource_id::TEXT;
      RAISE NOTICE 'Changed resource_id column type from UUID to TEXT';
    END IF;
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

  -- Add event_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN event_type TEXT;
    RAISE NOTICE 'Added event_type column to audit_logs';
  END IF;

  -- Remove NOT NULL constraint from event_type if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs'
    AND column_name = 'event_type'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE audit_logs ALTER COLUMN event_type DROP NOT NULL;
    RAISE NOTICE 'Removed NOT NULL constraint from event_type';
  END IF;

  -- Add ip_address if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
    RAISE NOTICE 'Added ip_address column to audit_logs';
  END IF;

  -- Add user_agent if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
    RAISE NOTICE 'Added user_agent column to audit_logs';
  END IF;
END $$;

-- =====================================================
-- STEP 2: FIX THE LOG_ADMIN_ACTION FUNCTION
-- =====================================================

-- Update the log_admin_action function to handle missing columns gracefully
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
  v_has_company_id BOOLEAN;
  v_has_event_type BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'company_id'
  ) INTO v_has_company_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'event_type'
  ) INTO v_has_event_type;

  -- Try to insert with all available columns
  BEGIN
    IF v_has_company_id AND v_has_event_type THEN
      INSERT INTO audit_logs (
        company_id,
        user_id,
        action_type,
        resource_type,
        resource_id,
        description,
        metadata,
        event_type
      ) VALUES (
        COALESCE(NEW.company_id, OLD.company_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        'Administrative action on ' || TG_TABLE_NAME,
        jsonb_build_object(
          'table', TG_TABLE_NAME,
          'operation', TG_OP,
          'timestamp', now()
        ),
        TG_TABLE_NAME || '.' || LOWER(TG_OP)
      );
    ELSIF v_has_company_id THEN
      INSERT INTO audit_logs (
        company_id,
        user_id,
        action_type,
        resource_type,
        resource_id,
        description,
        metadata
      ) VALUES (
        COALESCE(NEW.company_id, OLD.company_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        'Administrative action on ' || TG_TABLE_NAME,
        jsonb_build_object(
          'table', TG_TABLE_NAME,
          'operation', TG_OP,
          'timestamp', now()
        )
      );
    ELSE
      -- Fallback: minimal logging
      INSERT INTO audit_logs (
        user_id,
        action_type,
        resource_type,
        resource_id,
        description,
        metadata
      ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        'Administrative action on ' || TG_TABLE_NAME,
        jsonb_build_object(
          'table', TG_TABLE_NAME,
          'operation', TG_OP,
          'timestamp', now()
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If insert fails, log the error but don't break the transaction
      RAISE WARNING 'Failed to log admin action: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: ENSURE TENANTS TABLE HAS ALL REQUIRED COLUMNS
-- =====================================================

-- Create tenants table if it doesn't exist
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

  -- Add logo_url if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE tenants ADD COLUMN logo_url TEXT;
    RAISE NOTICE 'Added logo_url column to tenants';
  END IF;

  -- Add settings if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'settings'
  ) THEN
    ALTER TABLE tenants ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added settings column to tenants';
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

  -- Store in a temp table for later use
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
    -- Add the column without foreign key first
    ALTER TABLE user_profiles ADD COLUMN tenant_id UUID;

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
    ALTER TABLE projects ADD COLUMN tenant_id UUID;
    CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
    RAISE NOTICE 'Added tenant_id column to projects';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'projects table does not exist yet';
END $$;

-- Companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN tenant_id UUID;
    CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);
    RAISE NOTICE 'Added tenant_id column to companies';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'companies table does not exist yet';
END $$;

-- Time entries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN tenant_id UUID;
    CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);
    RAISE NOTICE 'Added tenant_id column to time_entries';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'time_entries table does not exist yet';
END $$;

-- GPS time entries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gps_time_entries'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE gps_time_entries ADD COLUMN tenant_id UUID;
    CREATE INDEX IF NOT EXISTS idx_gps_time_entries_tenant ON gps_time_entries(tenant_id);
    RAISE NOTICE 'Added tenant_id column to gps_time_entries';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'gps_time_entries table does not exist yet';
END $$;

-- Geofences table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'geofences'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE geofences ADD COLUMN tenant_id UUID;
    CREATE INDEX IF NOT EXISTS idx_geofences_tenant ON geofences(tenant_id);
    RAISE NOTICE 'Added tenant_id column to geofences';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'geofences table does not exist yet';
END $$;

-- =====================================================
-- STEP 7: ASSIGN DEFAULT TENANT TO EXISTING RECORDS
-- =====================================================

DO $$
DECLARE
  default_tenant_id UUID;
  updated_users INTEGER := 0;
  updated_projects INTEGER := 0;
  updated_companies INTEGER := 0;
  updated_time_entries INTEGER := 0;
  updated_gps_entries INTEGER := 0;
  updated_geofences INTEGER := 0;
BEGIN
  -- Get the default tenant ID
  SELECT id INTO default_tenant_id FROM temp_default_tenant;

  -- Update user_profiles with NULL tenant_id
  UPDATE user_profiles
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_users = ROW_COUNT;

  -- Update projects with NULL tenant_id (if table exists)
  BEGIN
    UPDATE projects
    SET tenant_id = default_tenant_id
    WHERE tenant_id IS NULL;
    GET DIAGNOSTICS updated_projects = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'projects table does not exist';
  END;

  -- Update companies with NULL tenant_id (if table exists)
  BEGIN
    UPDATE companies
    SET tenant_id = default_tenant_id
    WHERE tenant_id IS NULL;
    GET DIAGNOSTICS updated_companies = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'companies table does not exist';
  END;

  -- Update time_entries with NULL tenant_id (if table exists)
  BEGIN
    UPDATE time_entries
    SET tenant_id = default_tenant_id
    WHERE tenant_id IS NULL;
    GET DIAGNOSTICS updated_time_entries = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'time_entries table does not exist';
  END;

  -- Update gps_time_entries with NULL tenant_id (if table exists)
  BEGIN
    UPDATE gps_time_entries
    SET tenant_id = default_tenant_id
    WHERE tenant_id IS NULL;
    GET DIAGNOSTICS updated_gps_entries = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'gps_time_entries table does not exist';
  END;

  -- Update geofences with NULL tenant_id (if table exists)
  BEGIN
    UPDATE geofences
    SET tenant_id = default_tenant_id
    WHERE tenant_id IS NULL;
    GET DIAGNOSTICS updated_geofences = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'geofences table does not exist';
  END;

  RAISE NOTICE 'Assigned default tenant % to existing records:', default_tenant_id;
  RAISE NOTICE '  - Users: %', updated_users;
  RAISE NOTICE '  - Projects: %', updated_projects;
  RAISE NOTICE '  - Companies: %', updated_companies;
  RAISE NOTICE '  - Time Entries: %', updated_time_entries;
  RAISE NOTICE '  - GPS Entries: %', updated_gps_entries;
  RAISE NOTICE '  - Geofences: %', updated_geofences;
END $$;

-- =====================================================
-- STEP 8: ADD FOREIGN KEY CONSTRAINTS (AFTER DATA IS SET)
-- =====================================================

DO $$
BEGIN
  -- Add foreign key to user_profiles if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_tenant_id_fkey'
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint to user_profiles.tenant_id';
  END IF;
END $$;

DO $$
BEGIN
  -- Add foreign key to projects if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_tenant_id_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT projects_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint to projects.tenant_id';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'projects table does not exist';
END $$;

-- =====================================================
-- STEP 9: CREATE HELPER FUNCTIONS
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
-- STEP 10: FIX RLS POLICIES
-- =====================================================

-- Fix gps_time_entries policies if table exists
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
    RAISE NOTICE 'Table gps_time_entries does not exist yet';
END $$;

-- Fix geofences policies if table exists
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
    RAISE NOTICE 'Table geofences does not exist yet';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  tenant_count INTEGER;
  user_with_tenant_count INTEGER;
  audit_log_has_company_id BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO user_with_tenant_count FROM user_profiles WHERE tenant_id IS NOT NULL;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'company_id'
  ) INTO audit_log_has_company_id;

  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Total tenants: %', tenant_count;
  RAISE NOTICE 'Users with tenant_id: %', user_with_tenant_count;
  RAISE NOTICE 'Audit logs has company_id: %', audit_log_has_company_id;
END $$;

COMMENT ON FUNCTION get_user_tenant_id() IS 'Returns the tenant_id for the current authenticated user';
COMMENT ON FUNCTION is_user_admin() IS 'Checks if the current user is an admin or root_admin';
COMMENT ON FUNCTION has_tenant_access(UUID) IS 'Checks if the current user has access to a specific tenant';
