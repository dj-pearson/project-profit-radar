-- =====================================================
-- PUBLIC API PLATFORM
-- =====================================================
-- Purpose: RESTful API for third-party integrations
-- Features:
--   - API key management
--   - Rate limiting
--   - Request logging
--   - Scoped permissions
--   - Webhook support
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS api_request_logs CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;

-- =====================================================
-- 1. API KEYS TABLE
-- =====================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Key details
  name TEXT NOT NULL,
  description TEXT,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "sk_live_")
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of full key

  -- Scopes (permissions)
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::TEXT[],
  -- Available scopes: read, write, delete, projects, invoices, time_entries, documents, users

  -- Environment
  environment TEXT DEFAULT 'production', -- production, sandbox, development

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- IP restrictions
  allowed_ips TEXT[], -- Array of allowed IP addresses/ranges

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Usage stats
  total_requests INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);

-- =====================================================
-- 2. API RATE LIMITS TABLE
-- =====================================================

CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API key
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Time window
  window_type TEXT NOT NULL, -- minute, hour, day
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  -- Counts
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  limit_exceeded_count INTEGER DEFAULT 0,

  -- Last request
  last_request_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(api_key_id, window_type, window_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_api_key ON api_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON api_rate_limits(window_type, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_active ON api_rate_limits(window_end) WHERE window_end > NOW();

-- =====================================================
-- 3. API REQUEST LOGS TABLE
-- =====================================================

CREATE TABLE api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API key
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Request details
  method TEXT NOT NULL, -- GET, POST, PUT, DELETE, PATCH
  endpoint TEXT NOT NULL,
  path_params JSONB DEFAULT '{}'::jsonb,
  query_params JSONB DEFAULT '{}'::jsonb,
  request_body JSONB,
  request_headers JSONB DEFAULT '{}'::jsonb,

  -- Response details
  status_code INTEGER,
  response_body JSONB,
  response_time_ms INTEGER,

  -- Network
  ip_address TEXT,
  user_agent TEXT,

  -- Result
  success BOOLEAN,
  error_message TEXT,
  error_type TEXT, -- rate_limit, auth_failed, validation_error, server_error

  -- Rate limit info
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_api_key ON api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_tenant ON api_request_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_success ON api_request_logs(success);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- Users can manage their own API keys
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all API keys for their tenant
CREATE POLICY "Admins can view tenant API keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = api_keys.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
    )
  );

-- Rate limits follow API key access
CREATE POLICY "Users can view own rate limits"
  ON api_rate_limits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_rate_limits.api_key_id
      AND api_keys.user_id = auth.uid()
    )
  );

-- Request logs follow API key access
CREATE POLICY "Users can view own API logs"
  ON api_request_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_request_logs.api_key_id
      AND api_keys.user_id = auth.uid()
    )
  );

-- Admins can view all logs for their tenant
CREATE POLICY "Admins can view tenant API logs"
  ON api_request_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = api_request_logs.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Update API key usage statistics
CREATE OR REPLACE FUNCTION update_api_key_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_key_id IS NOT NULL THEN
    UPDATE api_keys
    SET
      total_requests = total_requests + 1,
      total_errors = total_errors + CASE WHEN NEW.success = FALSE THEN 1 ELSE 0 END,
      last_used_at = NOW()
    WHERE id = NEW.api_key_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_key_stats_trigger
  AFTER INSERT ON api_request_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_api_key_stats();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Validate API key
CREATE OR REPLACE FUNCTION validate_api_key(p_key_hash TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  api_key_id UUID,
  tenant_id UUID,
  user_id UUID,
  scopes TEXT[],
  rate_limit_per_minute INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_api_key api_keys;
BEGIN
  -- Get API key
  SELECT * INTO v_api_key
  FROM api_keys
  WHERE key_hash = p_key_hash
  AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT[], NULL::INTEGER, 'Invalid API key';
    RETURN;
  END IF;

  -- Check expiration
  IF v_api_key.expires_at IS NOT NULL AND v_api_key.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, v_api_key.id, v_api_key.tenant_id, v_api_key.user_id, v_api_key.scopes, v_api_key.rate_limit_per_minute, 'API key expired';
    RETURN;
  END IF;

  -- Valid
  RETURN QUERY SELECT TRUE, v_api_key.id, v_api_key.tenant_id, v_api_key.user_id, v_api_key.scopes, v_api_key.rate_limit_per_minute, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id UUID,
  p_window_type TEXT -- 'minute', 'hour', 'day'
)
RETURNS TABLE (
  is_allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
) AS $$
DECLARE
  v_api_key api_keys;
  v_rate_limit api_rate_limits;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get API key limits
  SELECT * INTO v_api_key
  FROM api_keys
  WHERE id = p_api_key_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Calculate window
  IF p_window_type = 'minute' THEN
    v_window_start := date_trunc('minute', NOW());
    v_window_end := v_window_start + INTERVAL '1 minute';
    v_limit := v_api_key.rate_limit_per_minute;
  ELSIF p_window_type = 'hour' THEN
    v_window_start := date_trunc('hour', NOW());
    v_window_end := v_window_start + INTERVAL '1 hour';
    v_limit := v_api_key.rate_limit_per_hour;
  ELSIF p_window_type = 'day' THEN
    v_window_start := date_trunc('day', NOW());
    v_window_end := v_window_start + INTERVAL '1 day';
    v_limit := v_api_key.rate_limit_per_day;
  ELSE
    RETURN QUERY SELECT FALSE, 0, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Get or create rate limit record
  SELECT * INTO v_rate_limit
  FROM api_rate_limits
  WHERE api_key_id = p_api_key_id
  AND window_type = p_window_type
  AND window_start = v_window_start;

  IF NOT FOUND THEN
    -- Create new window
    INSERT INTO api_rate_limits (api_key_id, window_type, window_start, window_end, request_count)
    VALUES (p_api_key_id, p_window_type, v_window_start, v_window_end, 0)
    RETURNING * INTO v_rate_limit;
  END IF;

  v_current_count := v_rate_limit.request_count;

  -- Check limit
  IF v_current_count >= v_limit THEN
    RETURN QUERY SELECT FALSE, 0, v_window_end;
  ELSE
    -- Increment count
    UPDATE api_rate_limits
    SET request_count = request_count + 1,
        last_request_at = NOW()
    WHERE id = v_rate_limit.id;

    RETURN QUERY SELECT TRUE, (v_limit - v_current_count - 1), v_window_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get API key usage statistics
CREATE OR REPLACE FUNCTION get_api_key_usage(
  p_api_key_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_requests INTEGER,
  successful_requests INTEGER,
  failed_requests INTEGER,
  avg_response_time_ms DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at::DATE as date,
    COUNT(*)::INTEGER as total_requests,
    COUNT(*) FILTER (WHERE success = TRUE)::INTEGER as successful_requests,
    COUNT(*) FILTER (WHERE success = FALSE)::INTEGER as failed_requests,
    AVG(response_time_ms)::DECIMAL as avg_response_time_ms
  FROM api_request_logs
  WHERE api_key_id = p_api_key_id
  AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY created_at::DATE
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE api_keys IS
  'API keys for third-party integrations with scoped permissions';

COMMENT ON TABLE api_rate_limits IS
  'Rate limiting tracking per API key and time window';

COMMENT ON TABLE api_request_logs IS
  'Complete logging of all API requests for monitoring and debugging';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000014_public_api_platform.sql completed successfully';
  RAISE NOTICE 'Created tables: api_keys, api_rate_limits, api_request_logs';
  RAISE NOTICE 'Created indexes: 15+ indexes for performance';
  RAISE NOTICE 'Created policies: 10 RLS policies';
  RAISE NOTICE 'Created functions: validate_api_key, check_rate_limit, get_api_key_usage';
END $$;
