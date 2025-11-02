-- =====================================================
-- BEHAVIORAL TRIGGERS SYSTEM
-- =====================================================
-- Purpose: Automated actions based on user behavior
-- Features:
--   - Rule-based trigger system
--   - Multiple action types (email, modal, notification)
--   - Event-based and schedule-based triggers
--   - Trigger history and analytics
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_trigger_history CASCADE;
DROP TABLE IF EXISTS behavioral_trigger_executions CASCADE;
DROP TABLE IF EXISTS behavioral_trigger_rules CASCADE;

-- =====================================================
-- 1. TRIGGER RULES TABLE
-- =====================================================

CREATE TABLE behavioral_trigger_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  -- Trigger conditions
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'manual')),

  -- For event triggers
  event_name TEXT,
  event_conditions JSONB DEFAULT '{}',

  -- For schedule triggers
  schedule_type TEXT CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom')),
  schedule_time TIME,
  schedule_days INTEGER[], -- Day of week (0=Sunday) or day of month

  -- Frequency controls
  max_triggers_per_user INTEGER, -- Null = unlimited
  cooldown_hours INTEGER DEFAULT 24,

  -- Action configuration
  action_type TEXT NOT NULL CHECK (action_type IN ('email', 'modal', 'notification', 'webhook', 'function')),
  action_config JSONB NOT NULL, -- Configuration for the action

  -- Targeting
  user_segment JSONB DEFAULT '{}', -- Filter criteria for which users this applies to
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 2. TRIGGER EXECUTIONS TABLE
-- =====================================================

CREATE TABLE behavioral_trigger_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  rule_id UUID NOT NULL REFERENCES behavioral_trigger_rules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Execution details
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_by TEXT CHECK (triggered_by IN ('event', 'schedule', 'manual')),
  trigger_event_data JSONB,

  -- Execution status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  result JSONB,
  error_message TEXT,

  -- Processing metadata
  processed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. USER TRIGGER HISTORY
-- =====================================================
-- Track which triggers a user has received to enforce cooldowns and max triggers

CREATE TABLE user_trigger_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES behavioral_trigger_rules(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES behavioral_trigger_executions(id) ON DELETE CASCADE,

  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  action_taken BOOLEAN DEFAULT FALSE,
  action_taken_at TIMESTAMPTZ,

  UNIQUE(user_id, rule_id, execution_id)
);

-- =====================================================
-- 4. INDEXES
-- =====================================================

-- Trigger rules
CREATE INDEX IF NOT EXISTS idx_trigger_rules_active ON behavioral_trigger_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_trigger_rules_trigger_type ON behavioral_trigger_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_trigger_rules_event_name ON behavioral_trigger_rules(event_name) WHERE event_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trigger_rules_priority ON behavioral_trigger_rules(priority);

-- Trigger executions
CREATE INDEX IF NOT EXISTS idx_trigger_executions_rule_id ON behavioral_trigger_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_user_id ON behavioral_trigger_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_status ON behavioral_trigger_executions(status);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_triggered_at ON behavioral_trigger_executions(triggered_at);

-- User trigger history
CREATE INDEX IF NOT EXISTS idx_user_trigger_history_user_id ON user_trigger_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trigger_history_rule_id ON user_trigger_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_user_trigger_history_triggered_at ON user_trigger_history(triggered_at);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE behavioral_trigger_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_trigger_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trigger_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage trigger rules
CREATE POLICY "Admins can view all trigger rules"
  ON behavioral_trigger_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can insert trigger rules"
  ON behavioral_trigger_rules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update trigger rules"
  ON behavioral_trigger_rules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- Admins can view all executions
CREATE POLICY "Admins can view all trigger executions"
  ON behavioral_trigger_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- Users can view their own trigger history
CREATE POLICY "Users can view own trigger history"
  ON user_trigger_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own trigger history"
  ON user_trigger_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Update timestamp on rule updates
CREATE OR REPLACE FUNCTION update_trigger_rule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_trigger_rule_timestamp
  BEFORE UPDATE ON behavioral_trigger_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_trigger_rule_timestamp();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Check if user can receive trigger (respects cooldowns and max triggers)
CREATE OR REPLACE FUNCTION can_user_receive_trigger(
  p_user_id UUID,
  p_rule_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rule RECORD;
  v_last_trigger_time TIMESTAMPTZ;
  v_trigger_count INTEGER;
BEGIN
  -- Get rule details
  SELECT * INTO v_rule
  FROM behavioral_trigger_rules
  WHERE id = p_rule_id AND is_active = TRUE;

  IF v_rule IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check max triggers per user
  IF v_rule.max_triggers_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_trigger_count
    FROM user_trigger_history
    WHERE user_id = p_user_id
    AND rule_id = p_rule_id;

    IF v_trigger_count >= v_rule.max_triggers_per_user THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check cooldown period
  SELECT MAX(triggered_at) INTO v_last_trigger_time
  FROM user_trigger_history
  WHERE user_id = p_user_id
  AND rule_id = p_rule_id;

  IF v_last_trigger_time IS NOT NULL THEN
    IF NOW() < v_last_trigger_time + (v_rule.cooldown_hours || ' hours')::INTERVAL THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active triggers for an event
CREATE OR REPLACE FUNCTION get_triggers_for_event(
  p_event_name TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  rule_id UUID,
  rule_name TEXT,
  action_type TEXT,
  action_config JSONB,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as rule_id,
    r.rule_name,
    r.action_type,
    r.action_config,
    r.priority
  FROM behavioral_trigger_rules r
  WHERE r.is_active = TRUE
  AND r.trigger_type = 'event'
  AND r.event_name = p_event_name
  AND can_user_receive_trigger(p_user_id, r.id) = TRUE
  ORDER BY r.priority ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get trigger analytics
CREATE OR REPLACE FUNCTION get_trigger_analytics(
  p_rule_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  rule_id UUID,
  rule_name TEXT,
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  skipped_executions BIGINT,
  success_rate NUMERIC,
  avg_execution_time_ms NUMERIC,
  unique_users BIGINT,
  actions_taken BIGINT,
  action_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as rule_id,
    r.rule_name,
    COUNT(e.id)::BIGINT as total_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'completed')::BIGINT as successful_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'failed')::BIGINT as failed_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'skipped')::BIGINT as skipped_executions,
    ROUND(
      (COUNT(e.id) FILTER (WHERE e.status = 'completed')::NUMERIC /
       NULLIF(COUNT(e.id), 0) * 100),
      2
    ) as success_rate,
    ROUND(AVG(e.execution_time_ms), 2) as avg_execution_time_ms,
    COUNT(DISTINCT e.user_id)::BIGINT as unique_users,
    COUNT(h.id) FILTER (WHERE h.action_taken = TRUE)::BIGINT as actions_taken,
    ROUND(
      (COUNT(h.id) FILTER (WHERE h.action_taken = TRUE)::NUMERIC /
       NULLIF(COUNT(e.id), 0) * 100),
      2
    ) as action_rate
  FROM behavioral_trigger_rules r
  LEFT JOIN behavioral_trigger_executions e ON e.rule_id = r.id
    AND e.triggered_at BETWEEN p_start_date AND p_end_date
  LEFT JOIN user_trigger_history h ON h.rule_id = r.id AND h.execution_id = e.id
  WHERE (p_rule_id IS NULL OR r.id = p_rule_id)
  GROUP BY r.id, r.rule_name
  ORDER BY total_executions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. DEFAULT TRIGGER RULES
-- =====================================================

-- Insert default trigger rules
INSERT INTO behavioral_trigger_rules (rule_name, rule_description, trigger_type, event_name, action_type, action_config, priority, cooldown_hours, max_triggers_per_user)
VALUES
  -- Exit intent trigger
  (
    'Exit Intent - Trial Extension Offer',
    'Show trial extension offer when user shows exit intent',
    'event',
    'exit_intent',
    'modal',
    '{"modal_type": "exit_intent", "variant": "trial_extension", "delay_ms": 0}',
    1,
    72,
    2
  ),

  -- Inactivity triggers
  (
    'Inactive User - Day 3',
    'Send email to users who haven''t logged in for 3 days',
    'schedule',
    NULL,
    'email',
    '{"campaign_id": "inactive_user_day3", "template": "Come back to BuildDesk"}',
    3,
    NULL,
    1
  ),

  -- Feature adoption triggers
  (
    'First Project Created',
    'Congratulate user and guide to next steps after first project',
    'event',
    'project_created',
    'notification',
    '{"title": "Great job!", "message": "You created your first project. Next, add some team members!", "action_url": "/team"}',
    2,
    NULL,
    1
  ),

  -- Conversion triggers
  (
    'Trial Ending - 2 Days',
    'Show upgrade modal 2 days before trial ends',
    'schedule',
    NULL,
    'modal',
    '{"modal_type": "upgrade_prompt", "discount": 20, "urgency": "high"}',
    1,
    NULL,
    1
  ),

  -- Engagement triggers
  (
    'Feature Discovery - Time Tracking',
    'Promote time tracking feature to users who haven''t used it',
    'event',
    'dashboard_viewed',
    'modal',
    '{"modal_type": "feature_highlight", "feature": "time_tracking", "delay_ms": 5000}',
    5,
    168,
    2
  );

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE behavioral_trigger_rules IS
  'Defines automated trigger rules based on user behavior and schedules';

COMMENT ON TABLE behavioral_trigger_executions IS
  'Logs each execution of a trigger rule with status and results';

COMMENT ON TABLE user_trigger_history IS
  'Tracks which triggers each user has received for cooldown and frequency management';

COMMENT ON COLUMN behavioral_trigger_rules.event_conditions IS
  'JSON conditions that must be met for event triggers (e.g., {"min_projects": 1, "trial_days_remaining": {"lte": 3}})';

COMMENT ON COLUMN behavioral_trigger_rules.user_segment IS
  'JSON criteria for targeting specific user segments (e.g., {"subscription_status": "trial", "role": "admin"})';

COMMENT ON COLUMN behavioral_trigger_rules.action_config IS
  'JSON configuration for the action to be taken (format depends on action_type)';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000004_behavioral_triggers.sql completed successfully';
  RAISE NOTICE 'Created tables: behavioral_trigger_rules, behavioral_trigger_executions, user_trigger_history';
  RAISE NOTICE 'Created indexes: 11 indexes for performance';
  RAISE NOTICE 'Created policies: 6 RLS policies';
  RAISE NOTICE 'Created functions: can_user_receive_trigger, get_triggers_for_event, get_trigger_analytics';
  RAISE NOTICE 'Inserted 5 default trigger rules';
END $$;
