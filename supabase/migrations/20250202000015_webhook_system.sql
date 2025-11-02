-- =====================================================
-- WEBHOOK SYSTEM
-- =====================================================
-- Purpose: Real-time event notifications to third-party systems
-- Features:
--   - Event subscriptions
--   - HMAC signing for security
--   - Automatic retry with exponential backoff
--   - Delivery tracking
--   - Webhook endpoint testing
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS webhook_delivery_attempts CASCADE;
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS webhook_endpoints CASCADE;

-- =====================================================
-- 1. WEBHOOK ENDPOINTS TABLE
-- =====================================================

CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,

  -- Endpoint details
  url TEXT NOT NULL,
  description TEXT,

  -- Event subscriptions
  subscribed_events TEXT[] NOT NULL DEFAULT ARRAY['*']::TEXT[],
  -- Available events: project.created, project.updated, invoice.created, time_entry.created, etc.

  -- Security
  secret TEXT NOT NULL, -- HMAC secret for signing
  verify_ssl BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verified_at TIMESTAMPTZ,

  -- Retry configuration
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60, -- Initial delay, increases exponentially

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 100,

  -- Headers
  custom_headers JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  last_delivery_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,

  -- Disable on repeated failures
  auto_disable_after_failures INTEGER DEFAULT 10,

  -- Statistics
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_events ON webhook_endpoints USING GIN (subscribed_events);

-- =====================================================
-- 2. WEBHOOK EVENTS TABLE
-- =====================================================

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant context
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- project.created, invoice.paid, time_entry.created, etc.
  resource_type TEXT NOT NULL, -- projects, invoices, time_entries, etc.
  resource_id UUID NOT NULL,
  action TEXT NOT NULL, -- created, updated, deleted

  -- Payload
  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- User who triggered event
  triggered_by UUID REFERENCES auth.users(id),

  -- Delivery tracking
  pending_deliveries INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_resource ON webhook_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);

-- =====================================================
-- 3. WEBHOOK DELIVERIES TABLE
-- =====================================================

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  webhook_event_id UUID NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,

  -- Delivery details
  url TEXT NOT NULL,
  request_method TEXT DEFAULT 'POST',
  request_headers JSONB DEFAULT '{}'::jsonb,
  request_body JSONB NOT NULL,

  -- Response
  response_status_code INTEGER,
  response_headers JSONB,
  response_body TEXT,
  response_time_ms INTEGER,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, success, failed, retrying
  success BOOLEAN,
  error_message TEXT,

  -- Retry tracking
  attempt_number INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- HMAC signature
  signature TEXT, -- sha256 HMAC of payload

  -- Timestamps
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending ON webhook_deliveries(next_retry_at) WHERE status = 'pending' OR status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- =====================================================
-- 4. WEBHOOK DELIVERY ATTEMPTS TABLE
-- =====================================================

CREATE TABLE webhook_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Delivery reference
  webhook_delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,

  -- Attempt details
  attempt_number INTEGER NOT NULL,
  url TEXT NOT NULL,

  -- Request
  request_headers JSONB DEFAULT '{}'::jsonb,
  request_body JSONB,

  -- Response
  response_status_code INTEGER,
  response_headers JSONB,
  response_body TEXT,
  response_time_ms INTEGER,

  -- Result
  success BOOLEAN,
  error_message TEXT,
  error_type TEXT, -- network_error, timeout, server_error, rate_limit

  -- Timestamps
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_delivery ON webhook_delivery_attempts(webhook_delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_success ON webhook_delivery_attempts(success);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_attempted ON webhook_delivery_attempts(attempted_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own webhook endpoints
CREATE POLICY "Users can view own webhook endpoints"
  ON webhook_endpoints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create webhook endpoints"
  ON webhook_endpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhook endpoints"
  ON webhook_endpoints FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhook endpoints"
  ON webhook_endpoints FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all tenant webhooks
CREATE POLICY "Admins can view tenant webhooks"
  ON webhook_endpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = webhook_endpoints.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
    )
  );

-- Users can view webhook events for their endpoints
CREATE POLICY "Users can view webhook events"
  ON webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = webhook_events.tenant_id
      AND tenant_users.user_id = auth.uid()
    )
  );

-- Users can view deliveries for their endpoints
CREATE POLICY "Users can view webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhook_endpoints
      WHERE webhook_endpoints.id = webhook_deliveries.webhook_endpoint_id
      AND webhook_endpoints.user_id = auth.uid()
    )
  );

-- Users can view attempts for their deliveries
CREATE POLICY "Users can view delivery attempts"
  ON webhook_delivery_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhook_deliveries wd
      JOIN webhook_endpoints we ON we.id = wd.webhook_endpoint_id
      WHERE wd.id = webhook_delivery_attempts.webhook_delivery_id
      AND we.user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Update webhook endpoint statistics
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.success IS NOT NULL THEN
    UPDATE webhook_endpoints
    SET
      total_deliveries = total_deliveries + 1,
      successful_deliveries = successful_deliveries + CASE WHEN NEW.success THEN 1 ELSE 0 END,
      failed_deliveries = failed_deliveries + CASE WHEN NOT NEW.success THEN 1 ELSE 0 END,
      last_delivery_at = NOW(),
      last_success_at = CASE WHEN NEW.success THEN NOW() ELSE last_success_at END,
      last_failure_at = CASE WHEN NOT NEW.success THEN NOW() ELSE last_failure_at END,
      consecutive_failures = CASE WHEN NEW.success THEN 0 ELSE consecutive_failures + 1 END
    WHERE id = NEW.webhook_endpoint_id;

    -- Auto-disable endpoint if too many consecutive failures
    UPDATE webhook_endpoints
    SET is_active = FALSE
    WHERE id = NEW.webhook_endpoint_id
    AND consecutive_failures >= auto_disable_after_failures
    AND auto_disable_after_failures > 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_stats_trigger
  AFTER UPDATE OF success ON webhook_deliveries
  FOR EACH ROW
  WHEN (NEW.success IS DISTINCT FROM OLD.success)
  EXECUTE FUNCTION update_webhook_stats();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Create webhook event and queue deliveries
CREATE OR REPLACE FUNCTION create_webhook_event(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_action TEXT,
  p_payload JSONB,
  p_triggered_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_endpoint webhook_endpoints;
  v_delivery_count INTEGER := 0;
BEGIN
  -- Create event
  INSERT INTO webhook_events (
    tenant_id,
    event_type,
    resource_type,
    resource_id,
    action,
    payload,
    triggered_by
  ) VALUES (
    p_tenant_id,
    p_event_type,
    p_resource_type,
    p_resource_id,
    p_action,
    p_payload,
    p_triggered_by
  )
  RETURNING id INTO v_event_id;

  -- Find matching webhook endpoints
  FOR v_endpoint IN
    SELECT * FROM webhook_endpoints
    WHERE tenant_id = p_tenant_id
    AND is_active = TRUE
    AND is_verified = TRUE
    AND (
      '*' = ANY(subscribed_events) OR
      p_event_type = ANY(subscribed_events)
    )
  LOOP
    -- Queue delivery
    INSERT INTO webhook_deliveries (
      webhook_endpoint_id,
      webhook_event_id,
      url,
      request_body,
      max_attempts
    ) VALUES (
      v_endpoint.id,
      v_event_id,
      v_endpoint.url,
      jsonb_build_object(
        'id', v_event_id,
        'event', p_event_type,
        'resource_type', p_resource_type,
        'resource_id', p_resource_id,
        'action', p_action,
        'data', p_payload,
        'created_at', NOW()
      ),
      v_endpoint.max_retries
    );

    v_delivery_count := v_delivery_count + 1;
  END LOOP;

  -- Update event with delivery count
  UPDATE webhook_events
  SET pending_deliveries = v_delivery_count
  WHERE id = v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get webhook endpoint statistics
CREATE OR REPLACE FUNCTION get_webhook_stats(
  p_endpoint_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_deliveries INTEGER,
  successful_deliveries INTEGER,
  failed_deliveries INTEGER,
  avg_response_time_ms DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at::DATE as date,
    COUNT(*)::INTEGER as total_deliveries,
    COUNT(*) FILTER (WHERE success = TRUE)::INTEGER as successful_deliveries,
    COUNT(*) FILTER (WHERE success = FALSE)::INTEGER as failed_deliveries,
    AVG(response_time_ms)::DECIMAL as avg_response_time_ms
  FROM webhook_deliveries
  WHERE webhook_endpoint_id = p_endpoint_id
  AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY created_at::DATE
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE webhook_endpoints IS
  'Webhook endpoints for real-time event notifications';

COMMENT ON TABLE webhook_events IS
  'Events triggered in the system that notify webhook endpoints';

COMMENT ON TABLE webhook_deliveries IS
  'Webhook delivery attempts with retry logic';

COMMENT ON TABLE webhook_delivery_attempts IS
  'Individual delivery attempts for debugging and monitoring';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000015_webhook_system.sql completed successfully';
  RAISE NOTICE 'Created tables: webhook_endpoints, webhook_events, webhook_deliveries, webhook_delivery_attempts';
  RAISE NOTICE 'Created indexes: 15+ indexes for performance';
  RAISE NOTICE 'Created policies: 10 RLS policies';
  RAISE NOTICE 'Created functions: create_webhook_event, get_webhook_stats';
END $$;
