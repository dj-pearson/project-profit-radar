-- =====================================================
-- SSO PENDING STATES TABLES
-- =====================================================
-- Purpose: Store pending SSO authentication states
-- for SAML and OAuth flows
-- =====================================================

-- =====================================================
-- 1. SAML PENDING REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS saml_pending_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request identification
  request_id TEXT UNIQUE NOT NULL,
  connection_id UUID REFERENCES sso_connections(id) ON DELETE CASCADE,

  -- Return URL after auth
  return_url TEXT DEFAULT '/dashboard',

  -- Security tracking
  ip_address TEXT,
  user_agent TEXT,

  -- Expiration (5 minutes)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_saml_pending_request_id ON saml_pending_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_saml_pending_expires ON saml_pending_requests(expires_at);

-- Auto-cleanup expired requests
CREATE OR REPLACE FUNCTION cleanup_expired_saml_requests()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM saml_pending_requests WHERE expires_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_cleanup_saml_requests') THEN
    CREATE TRIGGER trigger_cleanup_saml_requests
      AFTER INSERT ON saml_pending_requests
      EXECUTE FUNCTION cleanup_expired_saml_requests();
  END IF;
END $$;

-- =====================================================
-- 2. OAUTH PENDING STATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS oauth_pending_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- State identification
  state TEXT UNIQUE NOT NULL,
  connection_id UUID REFERENCES sso_connections(id) ON DELETE CASCADE,

  -- PKCE support
  code_verifier TEXT,

  -- Return URL after auth
  return_url TEXT DEFAULT '/dashboard',

  -- Security tracking
  ip_address TEXT,
  user_agent TEXT,

  -- Expiration (10 minutes)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_oauth_pending_state ON oauth_pending_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_pending_expires ON oauth_pending_states(expires_at);

-- Auto-cleanup expired states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM oauth_pending_states WHERE expires_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_cleanup_oauth_states') THEN
    CREATE TRIGGER trigger_cleanup_oauth_states
      AFTER INSERT ON oauth_pending_states
      EXECUTE FUNCTION cleanup_expired_oauth_states();
  END IF;
END $$;

-- =====================================================
-- 3. SECURITY LOGS TABLE UPDATES
-- =====================================================

-- Add SSO-related event types to security_logs if needed
-- (The table should already exist from previous migrations)

-- Ensure security_logs has site_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'security_logs' AND column_name = 'site_id'
  ) THEN
    ALTER TABLE security_logs ADD COLUMN site_id UUID REFERENCES sites(id);
    CREATE INDEX idx_security_logs_site ON security_logs(site_id);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- Create security_logs table if it doesn't exist
    CREATE TABLE security_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID REFERENCES sites(id),
      user_id UUID REFERENCES auth.users(id),
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      details JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_security_logs_site ON security_logs(site_id);
    CREATE INDEX idx_security_logs_user ON security_logs(user_id);
    CREATE INDEX idx_security_logs_event ON security_logs(event_type);
    CREATE INDEX idx_security_logs_created ON security_logs(created_at);
END $$;

-- =====================================================
-- 4. USER SECURITY TABLE UPDATES
-- =====================================================

-- Ensure user_security has site_id column for multi-tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_security' AND column_name = 'site_id'
  ) THEN
    ALTER TABLE user_security ADD COLUMN site_id UUID REFERENCES sites(id);
    CREATE INDEX idx_user_security_site ON user_security(site_id);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- Create user_security table if it doesn't exist
    CREATE TABLE user_security (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID REFERENCES sites(id),
      user_id UUID REFERENCES auth.users(id) NOT NULL,
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      two_factor_secret TEXT,
      backup_codes TEXT[],
      failed_login_attempts INTEGER DEFAULT 0,
      last_failed_login_at TIMESTAMPTZ,
      account_locked_until TIMESTAMPTZ,
      last_password_change TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, site_id)
    );

    CREATE INDEX idx_user_security_user ON user_security(user_id);
    CREATE INDEX idx_user_security_site ON user_security(site_id);
END $$;

-- =====================================================
-- 5. ADD SITE_ID TO SSO_CONNECTIONS IF MISSING
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sso_connections' AND column_name = 'site_id'
  ) THEN
    ALTER TABLE sso_connections ADD COLUMN site_id UUID REFERENCES sites(id);
    CREATE INDEX idx_sso_connections_site ON sso_connections(site_id);
  END IF;
END $$;

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE saml_pending_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_pending_states ENABLE ROW LEVEL SECURITY;

-- Service role can manage pending states
CREATE POLICY "Service role manages SAML requests"
  ON saml_pending_requests FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages OAuth states"
  ON oauth_pending_states FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to check if MFA is required for user
CREATE OR REPLACE FUNCTION check_user_mfa_required(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_mfa_enabled BOOLEAN;
BEGIN
  SELECT two_factor_enabled INTO v_mfa_enabled
  FROM user_security
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_mfa_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment MFA uses (for tracking)
CREATE OR REPLACE FUNCTION increment_mfa_uses(p_device_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  UPDATE mfa_devices
  SET total_uses = total_uses + 1
  WHERE id = p_device_id
  RETURNING total_uses INTO v_total;

  RETURN COALESCE(v_total, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20251202220000_sso_pending_states.sql completed successfully';
  RAISE NOTICE 'Created tables: saml_pending_requests, oauth_pending_states';
  RAISE NOTICE 'Created indexes: 4 indexes for performance';
  RAISE NOTICE 'Created triggers: 2 cleanup triggers';
  RAISE NOTICE 'Created functions: check_user_mfa_required, increment_mfa_uses';
END $$;
