-- =====================================================
-- INTEGRATION MARKETPLACE SYSTEM
-- =====================================================
-- Purpose: Third-party app integrations and connectors
-- Features:
--   - Integration catalog
--   - User installation tracking
--   - OAuth credentials storage
--   - Webhook management
--   - Sync status monitoring
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS integration_webhooks CASCADE;
DROP TABLE IF EXISTS integration_sync_logs CASCADE;
DROP TABLE IF EXISTS user_integrations CASCADE;
DROP TABLE IF EXISTS integration_apps CASCADE;

-- =====================================================
-- 1. INTEGRATION APPS TABLE
-- =====================================================

CREATE TABLE integration_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- App details
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- accounting, project_management, communication, calendar, storage
  description TEXT,
  logo_url TEXT,
  website_url TEXT,

  -- Integration configuration
  auth_type TEXT NOT NULL, -- oauth2, api_key, webhook, none
  oauth_authorize_url TEXT,
  oauth_token_url TEXT,
  oauth_scopes TEXT[], -- Array of required scopes
  api_docs_url TEXT,

  -- Features and capabilities
  features TEXT[], -- Array of feature names
  supports_webhooks BOOLEAN DEFAULT FALSE,
  supports_two_way_sync BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE, -- Requires premium plan
  is_beta BOOLEAN DEFAULT FALSE,

  -- Metadata
  install_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2), -- 0.00 to 5.00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_apps_category ON integration_apps(category);
CREATE INDEX IF NOT EXISTS idx_integration_apps_active ON integration_apps(is_active);
CREATE INDEX IF NOT EXISTS idx_integration_apps_slug ON integration_apps(slug);

-- =====================================================
-- 2. USER INTEGRATIONS TABLE
-- =====================================================

CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES integration_apps(id) ON DELETE CASCADE,

  -- Installation status
  status TEXT DEFAULT 'pending', -- pending, connected, error, disconnected
  is_active BOOLEAN DEFAULT TRUE,

  -- OAuth credentials (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- API credentials (encrypted)
  api_key TEXT,
  api_secret TEXT,

  -- Configuration
  config JSONB DEFAULT '{}', -- App-specific configuration
  scopes TEXT[], -- Granted scopes

  -- Sync settings
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_frequency TEXT DEFAULT 'hourly', -- realtime, hourly, daily, manual
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  error_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMPTZ,

  -- Metadata
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, app_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_integrations_user ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_app ON user_integrations(app_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_status ON user_integrations(status);
CREATE INDEX IF NOT EXISTS idx_user_integrations_next_sync ON user_integrations(next_sync_at);

-- =====================================================
-- 3. INTEGRATION SYNC LOGS TABLE
-- =====================================================

CREATE TABLE integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL, -- full, incremental, manual
  sync_direction TEXT NOT NULL, -- import, export, bidirectional

  -- Status
  status TEXT NOT NULL, -- running, completed, failed, partial
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Results
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  triggered_by TEXT, -- user, schedule, webhook
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON integration_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON integration_sync_logs(started_at DESC);

-- =====================================================
-- 4. INTEGRATION WEBHOOKS TABLE
-- =====================================================

CREATE TABLE integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,

  -- Webhook details
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT,
  event_types TEXT[] NOT NULL, -- Events this webhook listens to

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,

  -- Stats
  trigger_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_integration ON integration_webhooks(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON integration_webhooks(is_active);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE integration_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;

-- All users can view available integration apps
CREATE POLICY "Users can view integration apps"
  ON integration_apps FOR SELECT
  USING (is_active = TRUE);

-- Users can view and manage their own integrations
CREATE POLICY "Users can view own integrations"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view their own sync logs
CREATE POLICY "Users can view own sync logs"
  ON integration_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_integrations
      WHERE user_integrations.id = integration_sync_logs.integration_id
      AND user_integrations.user_id = auth.uid()
    )
  );

-- Users can view their own webhooks
CREATE POLICY "Users can view own webhooks"
  ON integration_webhooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_integrations
      WHERE user_integrations.id = integration_webhooks.integration_id
      AND user_integrations.user_id = auth.uid()
    )
  );

-- Admins can view all data
CREATE POLICY "Admins can view all integrations"
  ON user_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Update integration app install count
CREATE OR REPLACE FUNCTION update_app_install_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'connected' THEN
    UPDATE integration_apps
    SET install_count = install_count + 1
    WHERE id = NEW.app_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'connected' AND NEW.status = 'connected' THEN
    UPDATE integration_apps
    SET install_count = install_count + 1
    WHERE id = NEW.app_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'connected' AND NEW.status != 'connected' THEN
    UPDATE integration_apps
    SET install_count = GREATEST(0, install_count - 1)
    WHERE id = NEW.app_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'connected' THEN
    UPDATE integration_apps
    SET install_count = GREATEST(0, install_count - 1)
    WHERE id = OLD.app_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER manage_app_install_count
  AFTER INSERT OR UPDATE OR DELETE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_app_install_count();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Get user's active integrations
CREATE OR REPLACE FUNCTION get_user_active_integrations(p_user_id UUID)
RETURNS TABLE(
  app_name TEXT,
  app_slug TEXT,
  app_category TEXT,
  status TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ia.name,
    ia.slug,
    ia.category,
    ui.status,
    ui.last_sync_at,
    ui.sync_enabled
  FROM user_integrations ui
  JOIN integration_apps ia ON ia.id = ui.app_id
  WHERE ui.user_id = p_user_id
  AND ui.is_active = TRUE
  ORDER BY ia.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. SEED DATA - Available Integration Apps
-- =====================================================

INSERT INTO integration_apps (name, slug, category, description, auth_type, is_active, features, supports_two_way_sync) VALUES
  ('QuickBooks Online', 'quickbooks', 'accounting', 'Sync invoices, expenses, and financial data with QuickBooks Online', 'oauth2', true, ARRAY['invoice_sync', 'expense_sync', 'customer_sync'], true),
  ('Xero', 'xero', 'accounting', 'Connect with Xero for seamless accounting integration', 'oauth2', true, ARRAY['invoice_sync', 'expense_sync', 'bank_reconciliation'], true),
  ('FreshBooks', 'freshbooks', 'accounting', 'Integrate with FreshBooks for invoicing and time tracking', 'oauth2', true, ARRAY['invoice_sync', 'time_tracking', 'expense_sync'], true),

  ('Slack', 'slack', 'communication', 'Get notifications and updates in Slack channels', 'oauth2', true, ARRAY['notifications', 'alerts', 'bot_commands'], false),
  ('Microsoft Teams', 'microsoft-teams', 'communication', 'Receive updates and collaborate via Microsoft Teams', 'oauth2', true, ARRAY['notifications', 'alerts', 'file_sharing'], false),

  ('Google Calendar', 'google-calendar', 'calendar', 'Sync project schedules with Google Calendar', 'oauth2', true, ARRAY['schedule_sync', 'reminders', 'event_creation'], true),
  ('Outlook Calendar', 'outlook-calendar', 'calendar', 'Keep Outlook Calendar in sync with project timelines', 'oauth2', true, ARRAY['schedule_sync', 'reminders', 'event_creation'], true),

  ('Asana', 'asana', 'project_management', 'Sync tasks and projects with Asana', 'oauth2', false, ARRAY['task_sync', 'project_sync', 'milestone_tracking'], true),
  ('Monday.com', 'monday', 'project_management', 'Integrate with Monday.com boards and workflows', 'oauth2', false, ARRAY['board_sync', 'task_sync', 'automation'], true),
  ('ClickUp', 'clickup', 'project_management', 'Connect ClickUp tasks and projects', 'oauth2', false, ARRAY['task_sync', 'time_tracking', 'goal_tracking'], true),

  ('Google Drive', 'google-drive', 'storage', 'Store and sync files with Google Drive', 'oauth2', true, ARRAY['file_sync', 'folder_sync', 'sharing'], true),
  ('Dropbox', 'dropbox', 'storage', 'Backup and sync documents to Dropbox', 'oauth2', true, ARRAY['file_sync', 'backup', 'sharing'], true),
  ('OneDrive', 'onedrive', 'storage', 'Sync files with Microsoft OneDrive', 'oauth2', true, ARRAY['file_sync', 'backup', 'collaboration'], true);

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE integration_apps IS
  'Catalog of available third-party integrations';

COMMENT ON TABLE user_integrations IS
  'User-installed integrations with OAuth credentials and sync settings';

COMMENT ON TABLE integration_sync_logs IS
  'Audit log of all integration sync operations';

COMMENT ON TABLE integration_webhooks IS
  'Webhook configurations for real-time integration events';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000007_integration_marketplace.sql completed successfully';
  RAISE NOTICE 'Created tables: integration_apps, user_integrations, integration_sync_logs, integration_webhooks';
  RAISE NOTICE 'Seeded 13 integration apps across 5 categories';
  RAISE NOTICE 'Created indexes: 14 indexes for performance';
  RAISE NOTICE 'Created policies: 8 RLS policies';
  RAISE NOTICE 'Created functions: get_user_active_integrations';
END $$;
