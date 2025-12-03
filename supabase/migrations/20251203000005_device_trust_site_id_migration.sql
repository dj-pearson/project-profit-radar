-- =====================================================
-- DEVICE TRUST SITE_ID MIGRATION
-- =====================================================
-- Migration: 20251203000005
-- Purpose: Add site_id to device trust and session management tables
-- Date: 2025-12-03
-- Tables: trusted_devices, user_sessions, mfa_devices, sso_connections
-- CRITICAL: Ensures multi-tenant isolation for authentication tables
-- =====================================================

-- =====================================================
-- STEP 1: ADD site_id COLUMN TO DEVICE TRUST TABLES
-- =====================================================

-- Add site_id to trusted_devices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trusted_devices') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trusted_devices' AND column_name = 'site_id') THEN
      ALTER TABLE trusted_devices ADD COLUMN site_id UUID REFERENCES sites(id);
      RAISE NOTICE 'Added site_id to trusted_devices';
    END IF;
  END IF;
END $$;

-- Add site_id to user_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'site_id') THEN
      ALTER TABLE user_sessions ADD COLUMN site_id UUID REFERENCES sites(id);
      RAISE NOTICE 'Added site_id to user_sessions';
    END IF;
  END IF;
END $$;

-- Add site_id to mfa_devices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mfa_devices') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mfa_devices' AND column_name = 'site_id') THEN
      ALTER TABLE mfa_devices ADD COLUMN site_id UUID REFERENCES sites(id);
      RAISE NOTICE 'Added site_id to mfa_devices';
    END IF;
  END IF;
END $$;

-- Add site_id to sso_connections
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sso_connections') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sso_connections' AND column_name = 'site_id') THEN
      ALTER TABLE sso_connections ADD COLUMN site_id UUID REFERENCES sites(id);
      RAISE NOTICE 'Added site_id to sso_connections';
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 2: BACKFILL site_id FROM BUILDDESK SITE
-- =====================================================

DO $$
DECLARE
  v_builddesk_site_id UUID;
BEGIN
  -- Get or create BuildDesk site
  SELECT id INTO v_builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;

  -- If no BuildDesk site exists, create it
  IF v_builddesk_site_id IS NULL THEN
    INSERT INTO sites (key, name, domain, is_active, is_production)
    VALUES ('builddesk', 'BuildDesk', 'build-desk.com', true, true)
    RETURNING id INTO v_builddesk_site_id;
    RAISE NOTICE 'Created BuildDesk site with id: %', v_builddesk_site_id;
  END IF;

  -- Backfill site_id for trusted_devices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trusted_devices') THEN
    UPDATE trusted_devices SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    RAISE NOTICE 'Backfilled site_id for trusted_devices';
  END IF;

  -- Backfill site_id for user_sessions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    UPDATE user_sessions SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    RAISE NOTICE 'Backfilled site_id for user_sessions';
  END IF;

  -- Backfill site_id for mfa_devices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mfa_devices') THEN
    UPDATE mfa_devices SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    RAISE NOTICE 'Backfilled site_id for mfa_devices';
  END IF;

  -- Backfill site_id for sso_connections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sso_connections') THEN
    UPDATE sso_connections SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    RAISE NOTICE 'Backfilled site_id for sso_connections';
  END IF;

  RAISE NOTICE 'Completed backfilling site_id = % for all device trust tables', v_builddesk_site_id;
END $$;

-- =====================================================
-- STEP 3: CREATE INDEXES FOR site_id
-- =====================================================

-- Indexes for trusted_devices
CREATE INDEX IF NOT EXISTS idx_trusted_devices_site_id ON trusted_devices(site_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_site_user ON trusted_devices(site_id, user_id);

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_site_id ON user_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_site_user ON user_sessions(site_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_site_active ON user_sessions(site_id, is_active) WHERE is_active = TRUE;

-- Indexes for mfa_devices
CREATE INDEX IF NOT EXISTS idx_mfa_devices_site_id ON mfa_devices(site_id);
CREATE INDEX IF NOT EXISTS idx_mfa_devices_site_user ON mfa_devices(site_id, user_id);

-- Indexes for sso_connections
CREATE INDEX IF NOT EXISTS idx_sso_connections_site_id ON sso_connections(site_id);

-- =====================================================
-- STEP 4: DROP OLD RLS POLICIES
-- =====================================================

DO $$
BEGIN
  -- trusted_devices policies
  DROP POLICY IF EXISTS "Users can view own trusted devices" ON trusted_devices;
  DROP POLICY IF EXISTS "Users can manage own trusted devices" ON trusted_devices;

  -- user_sessions policies
  DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
  DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;

  -- mfa_devices policies
  DROP POLICY IF EXISTS "Users can view own MFA devices" ON mfa_devices;
  DROP POLICY IF EXISTS "Users can manage own MFA devices" ON mfa_devices;

  -- sso_connections policies
  DROP POLICY IF EXISTS "Tenant admins can view SSO connections" ON sso_connections;
  DROP POLICY IF EXISTS "Tenant admins can manage SSO connections" ON sso_connections;
  DROP POLICY IF EXISTS "Root admins can view all SSO connections" ON sso_connections;

  RAISE NOTICE 'Dropped old RLS policies';
END $$;

-- =====================================================
-- STEP 5: CREATE NEW site_id BASED RLS POLICIES
-- =====================================================

-- =====================================================
-- TRUSTED DEVICES POLICIES
-- =====================================================

-- Users can view their own trusted devices within their site
CREATE POLICY "site_trusted_devices_select"
  ON trusted_devices FOR SELECT
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Users can insert trusted devices for themselves within their site
CREATE POLICY "site_trusted_devices_insert"
  ON trusted_devices FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Users can update their own trusted devices within their site
CREATE POLICY "site_trusted_devices_update"
  ON trusted_devices FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Users can delete their own trusted devices within their site
CREATE POLICY "site_trusted_devices_delete"
  ON trusted_devices FOR DELETE
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Admins can view all trusted devices in their site
CREATE POLICY "site_trusted_devices_admin_select"
  ON trusted_devices FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND role IN ('admin', 'root_admin')
    )
  );

-- =====================================================
-- USER SESSIONS POLICIES
-- =====================================================

-- Users can view their own sessions within their site
CREATE POLICY "site_user_sessions_select"
  ON user_sessions FOR SELECT
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- System/service role can insert sessions
CREATE POLICY "site_user_sessions_insert"
  ON user_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Users can update their own sessions (for activity tracking)
CREATE POLICY "site_user_sessions_update"
  ON user_sessions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Users can delete/revoke their own sessions
CREATE POLICY "site_user_sessions_delete"
  ON user_sessions FOR DELETE
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Admins can view all sessions in their site
CREATE POLICY "site_user_sessions_admin_select"
  ON user_sessions FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND role IN ('admin', 'root_admin')
    )
  );

-- =====================================================
-- MFA DEVICES POLICIES
-- =====================================================

-- Users can view their own MFA devices within their site
CREATE POLICY "site_mfa_devices_select"
  ON mfa_devices FOR SELECT
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Users can add MFA devices for themselves
CREATE POLICY "site_mfa_devices_insert"
  ON mfa_devices FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Users can update their own MFA devices
CREATE POLICY "site_mfa_devices_update"
  ON mfa_devices FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- Users can delete their own MFA devices
CREATE POLICY "site_mfa_devices_delete"
  ON mfa_devices FOR DELETE
  USING (
    auth.uid() = user_id
    AND (
      site_id IS NULL
      OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    )
  );

-- =====================================================
-- SSO CONNECTIONS POLICIES
-- =====================================================

-- Site admins can view SSO connections for their site
CREATE POLICY "site_sso_connections_select"
  ON sso_connections FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND role IN ('admin', 'root_admin')
    )
  );

-- Site admins can create SSO connections
CREATE POLICY "site_sso_connections_insert"
  ON sso_connections FOR INSERT
  WITH CHECK (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND role IN ('admin', 'root_admin')
    )
  );

-- Site admins can update SSO connections
CREATE POLICY "site_sso_connections_update"
  ON sso_connections FOR UPDATE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND role IN ('admin', 'root_admin')
    )
  );

-- Site admins can delete SSO connections
CREATE POLICY "site_sso_connections_delete"
  ON sso_connections FOR DELETE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND role IN ('admin', 'root_admin')
    )
  );

-- Root admins can view all SSO connections across sites
CREATE POLICY "site_sso_connections_root_admin_select"
  ON sso_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'root_admin'
    )
  );

-- =====================================================
-- STEP 6: UPDATE HELPER FUNCTIONS
-- =====================================================

-- Update create_user_session to include site_id
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_tenant_id UUID,
  p_device_info JSONB,
  p_ip_address TEXT,
  p_auth_method TEXT DEFAULT 'password',
  p_sso_connection_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_session_token TEXT;
  v_site_id UUID;
BEGIN
  -- Determine site_id: use provided, or look up from user profile
  IF p_site_id IS NOT NULL THEN
    v_site_id := p_site_id;
  ELSE
    SELECT site_id INTO v_site_id FROM user_profiles WHERE id = p_user_id LIMIT 1;
  END IF;

  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- Create session
  INSERT INTO user_sessions (
    user_id,
    tenant_id,
    site_id,
    session_token,
    device_name,
    device_type,
    device_id,
    user_agent,
    ip_address,
    auth_method,
    sso_connection_id
  ) VALUES (
    p_user_id,
    p_tenant_id,
    v_site_id,
    v_session_token,
    p_device_info->>'device_name',
    p_device_info->>'device_type',
    p_device_info->>'device_id',
    p_device_info->>'user_agent',
    p_ip_address,
    p_auth_method,
    p_sso_connection_id
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update revoke_all_user_sessions to respect site_id
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
  p_user_id UUID,
  p_site_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_site_id IS NOT NULL THEN
    UPDATE user_sessions
    SET is_active = FALSE
    WHERE user_id = p_user_id
    AND site_id = p_site_id
    AND is_active = TRUE;
  ELSE
    UPDATE user_sessions
    SET is_active = FALSE
    WHERE user_id = p_user_id
    AND is_active = TRUE;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_active_session_count to respect site_id
CREATE OR REPLACE FUNCTION get_active_session_count(
  p_user_id UUID,
  p_site_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_site_id IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM user_sessions
    WHERE user_id = p_user_id
    AND site_id = p_site_id
    AND is_active = TRUE
    AND expires_at > NOW();
  ELSE
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM user_sessions
    WHERE user_id = p_user_id
    AND is_active = TRUE
    AND expires_at > NOW();
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: ADD COMMENTS
-- =====================================================

COMMENT ON POLICY "site_trusted_devices_select" ON trusted_devices IS
  'Users can view their own trusted devices within their site';

COMMENT ON POLICY "site_trusted_devices_admin_select" ON trusted_devices IS
  'Admins can view all trusted devices within their site';

COMMENT ON POLICY "site_user_sessions_select" ON user_sessions IS
  'Users can view their own sessions within their site';

COMMENT ON POLICY "site_user_sessions_admin_select" ON user_sessions IS
  'Admins can view all sessions within their site';

COMMENT ON POLICY "site_mfa_devices_select" ON mfa_devices IS
  'Users can view their own MFA devices within their site';

COMMENT ON POLICY "site_sso_connections_select" ON sso_connections IS
  'Site admins can view SSO connections for their site';

-- =====================================================
-- STEP 8: VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_device_trust_tables TEXT[] := ARRAY[
    'trusted_devices', 'user_sessions', 'mfa_devices', 'sso_connections'
  ];
  v_table TEXT;
  v_has_site_id BOOLEAN;
  v_has_rls BOOLEAN;
  v_policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== Device Trust Site_ID Migration Verification ===';

  FOREACH v_table IN ARRAY v_device_trust_tables LOOP
    -- Check if site_id exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = v_table AND column_name = 'site_id'
    ) INTO v_has_site_id;

    -- Check if RLS is enabled
    SELECT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE tablename = v_table AND rowsecurity = true
    ) INTO v_has_rls;

    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = v_table;

    IF v_has_site_id AND v_has_rls AND v_policy_count > 0 THEN
      RAISE NOTICE '✓ %: site_id=YES, RLS=ENABLED, policies=%', v_table, v_policy_count;
    ELSIF v_has_site_id THEN
      RAISE NOTICE '⚠ %: site_id=YES, RLS=%, policies=%', v_table,
        CASE WHEN v_has_rls THEN 'ENABLED' ELSE 'DISABLED' END, v_policy_count;
    ELSE
      RAISE NOTICE '✗ %: site_id=NO, RLS=%, policies=%', v_table,
        CASE WHEN v_has_rls THEN 'ENABLED' ELSE 'DISABLED' END, v_policy_count;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Device Trust Site_ID Migration completed successfully!';
  RAISE NOTICE 'All device trust tables now use site_id for multi-site isolation.';
END $$;
