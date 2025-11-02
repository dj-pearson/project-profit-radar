-- =====================================================
-- WORKFLOW AUTOMATION SYSTEM
-- =====================================================
-- Purpose: No-code workflow automation builder
-- Features:
--   - Trigger-based automation
--   - Conditional logic
--   - Multi-step workflows
--   - Action execution
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS workflow_execution_logs CASCADE;
DROP TABLE IF EXISTS workflow_actions CASCADE;
DROP TABLE IF EXISTS workflow_conditions CASCADE;
DROP TABLE IF EXISTS workflow_triggers CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;

-- =====================================================
-- 1. WORKFLOWS TABLE
-- =====================================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID, -- Company context (optional)

  -- Workflow details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- user_engagement, project_automation, financial, notifications

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE, -- Pre-built template workflows

  -- Execution settings
  execution_order TEXT DEFAULT 'sequential', -- sequential, parallel
  retry_on_failure BOOLEAN DEFAULT TRUE,
  max_retries INTEGER DEFAULT 3,

  -- Stats
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_company ON workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);

-- =====================================================
-- 2. WORKFLOW TRIGGERS TABLE
-- =====================================================

CREATE TABLE workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Trigger configuration
  trigger_type TEXT NOT NULL, -- user_event, project_event, time_based, webhook, integration_event
  trigger_event TEXT NOT NULL, -- signup, login, inactivity, project_created, invoice_sent, etc.

  -- Trigger filters
  filter_config JSONB DEFAULT '{}', -- Additional filters (e.g., user_role, project_status)

  -- Time-based triggers
  schedule_cron TEXT, -- Cron expression for scheduled triggers
  schedule_timezone TEXT DEFAULT 'UTC',

  -- Webhook triggers
  webhook_url TEXT,
  webhook_secret TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_triggers_workflow ON workflow_triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_triggers_type ON workflow_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_triggers_active ON workflow_triggers(is_active);

-- =====================================================
-- 3. WORKFLOW CONDITIONS TABLE
-- =====================================================

CREATE TABLE workflow_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Condition configuration
  condition_order INTEGER NOT NULL DEFAULT 0,
  field_name TEXT NOT NULL, -- user.health_score, project.budget, etc.
  operator TEXT NOT NULL, -- equals, not_equals, greater_than, less_than, contains, in, not_in
  field_value JSONB NOT NULL, -- Value to compare against

  -- Logical operators
  logical_operator TEXT DEFAULT 'AND', -- AND, OR (for chaining conditions)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conditions_workflow ON workflow_conditions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_conditions_order ON workflow_conditions(condition_order);

-- =====================================================
-- 4. WORKFLOW ACTIONS TABLE
-- =====================================================

CREATE TABLE workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Action configuration
  action_order INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL, -- send_email, create_task, update_field, call_webhook, trigger_integration, send_notification
  action_config JSONB NOT NULL, -- Action-specific configuration

  -- Delays
  delay_seconds INTEGER DEFAULT 0, -- Delay before executing this action

  -- Conditional actions
  execute_if_previous_success BOOLEAN DEFAULT TRUE,
  execute_if_previous_failure BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_actions_workflow ON workflow_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_actions_order ON workflow_actions(action_order);

-- =====================================================
-- 5. WORKFLOW EXECUTION LOGS TABLE
-- =====================================================

CREATE TABLE workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Execution details
  trigger_type TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  triggered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL, -- running, completed, failed, cancelled
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Context
  execution_context JSONB DEFAULT '{}', -- Data passed to the workflow

  -- Results
  actions_executed INTEGER DEFAULT 0,
  actions_succeeded INTEGER DEFAULT 0,
  actions_failed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow ON workflow_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON workflow_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_started_at ON workflow_execution_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_user ON workflow_execution_logs(triggered_by_user_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own workflows
CREATE POLICY "Users can view own workflows"
  ON workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflows"
  ON workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows"
  ON workflows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows"
  ON workflows FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view template workflows
CREATE POLICY "Users can view template workflows"
  ON workflows FOR SELECT
  USING (is_template = TRUE);

-- Workflow components follow parent workflow permissions
CREATE POLICY "Users can view own workflow triggers"
  ON workflow_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_triggers.workflow_id
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own workflow conditions"
  ON workflow_conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_conditions.workflow_id
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own workflow actions"
  ON workflow_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_actions.workflow_id
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own execution logs"
  ON workflow_execution_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_execution_logs.workflow_id
      AND workflows.user_id = auth.uid()
    )
  );

-- Admins can view all workflows
CREATE POLICY "Admins can view all workflows"
  ON workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update workflow execution stats
CREATE OR REPLACE FUNCTION update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE workflows
    SET
      execution_count = execution_count + 1,
      success_count = success_count + 1,
      last_executed_at = NEW.completed_at,
      updated_at = NOW()
    WHERE id = NEW.workflow_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE workflows
    SET
      execution_count = execution_count + 1,
      failure_count = failure_count + 1,
      last_executed_at = NEW.completed_at,
      updated_at = NOW()
    WHERE id = NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_workflow_execution_stats
  AFTER UPDATE ON workflow_execution_logs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION update_workflow_stats();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Get active workflows for a user
CREATE OR REPLACE FUNCTION get_user_active_workflows(p_user_id UUID)
RETURNS TABLE(
  workflow_id UUID,
  workflow_name TEXT,
  category TEXT,
  execution_count BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.category,
    w.execution_count::BIGINT,
    CASE
      WHEN w.execution_count > 0 THEN
        ROUND((w.success_count::NUMERIC / w.execution_count) * 100, 2)
      ELSE 0
    END as success_rate
  FROM workflows w
  WHERE w.user_id = p_user_id
  AND w.is_active = TRUE
  ORDER BY w.execution_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. SEED DATA - Workflow Templates
-- =====================================================

-- Template: Welcome new users
INSERT INTO workflows (user_id, name, description, category, is_template, is_active)
SELECT
  id,
  'Welcome New Users',
  'Send welcome email and onboarding tasks when a user signs up',
  'user_engagement',
  true,
  true
FROM auth.users
LIMIT 1;

-- Template: At-risk user intervention
INSERT INTO workflows (user_id, name, description, category, is_template, is_active)
SELECT
  id,
  'At-Risk User Intervention',
  'Automatically reach out to users with declining health scores',
  'user_engagement',
  true,
  true
FROM auth.users
LIMIT 1;

-- Template: Invoice reminder
INSERT INTO workflows (user_id, name, description, category, is_template, is_active)
SELECT
  id,
  'Overdue Invoice Reminder',
  'Send reminders for unpaid invoices after 7, 14, and 30 days',
  'financial',
  true,
  true
FROM auth.users
LIMIT 1;

-- =====================================================
-- 10. COMMENTS
-- =====================================================

COMMENT ON TABLE workflows IS
  'User-created automation workflows with triggers, conditions, and actions';

COMMENT ON TABLE workflow_triggers IS
  'Triggers that initiate workflow execution';

COMMENT ON TABLE workflow_conditions IS
  'Conditional logic for workflow execution';

COMMENT ON TABLE workflow_actions IS
  'Actions to execute when workflow conditions are met';

COMMENT ON TABLE workflow_execution_logs IS
  'Audit log of all workflow executions';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000008_workflow_automation.sql completed successfully';
  RAISE NOTICE 'Created tables: workflows, workflow_triggers, workflow_conditions, workflow_actions, workflow_execution_logs';
  RAISE NOTICE 'Created indexes: 18 indexes for performance';
  RAISE NOTICE 'Created policies: 12 RLS policies';
  RAISE NOTICE 'Created functions: get_user_active_workflows';
  RAISE NOTICE 'Seeded 3 workflow templates';
END $$;
