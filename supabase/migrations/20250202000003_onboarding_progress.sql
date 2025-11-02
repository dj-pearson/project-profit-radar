-- =====================================================
-- ONBOARDING PROGRESS TRACKING SYSTEM
-- =====================================================
-- Purpose: Track user onboarding completion and gamification
-- Features:
--   - Task completion tracking
--   - Point system for gamification
--   - Progress persistence across sessions
--   - Dismissal tracking
-- =====================================================

-- =====================================================
-- 1. ONBOARDING PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Progress tracking
  tasks_completed TEXT[] DEFAULT '{}',
  total_points INTEGER DEFAULT 0,

  -- Completion tracking
  completed_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_completed_at ON onboarding_progress(completed_at);
CREATE INDEX idx_onboarding_progress_dismissed ON onboarding_progress(dismissed);
CREATE INDEX idx_onboarding_progress_total_points ON onboarding_progress(total_points);

-- Index for finding incomplete onboarding
CREATE INDEX idx_onboarding_progress_incomplete
  ON onboarding_progress(user_id)
  WHERE completed_at IS NULL AND dismissed = FALSE;

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own progress
CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
  ON onboarding_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
  ON onboarding_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all progress (for analytics)
CREATE POLICY "Admins can view all onboarding progress"
  ON onboarding_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Update timestamp on changes
CREATE OR REPLACE FUNCTION update_onboarding_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Auto-set completed_at when all tasks are done
  -- Assuming 9 tasks total (from OnboardingChecklist component)
  IF array_length(NEW.tasks_completed, 1) >= 9 AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;

  -- Auto-set dismissed_at when dismissed
  IF NEW.dismissed = TRUE AND OLD.dismissed = FALSE AND NEW.dismissed_at IS NULL THEN
    NEW.dismissed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_onboarding_progress_timestamp
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress_timestamp();

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get onboarding completion rate for analytics
CREATE OR REPLACE FUNCTION get_onboarding_completion_rate()
RETURNS TABLE(
  total_users BIGINT,
  completed_users BIGINT,
  completion_rate NUMERIC,
  average_points NUMERIC,
  average_tasks_completed NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_users,
    COUNT(completed_at)::BIGINT as completed_users,
    ROUND(
      (COUNT(completed_at)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as completion_rate,
    ROUND(AVG(total_points), 2) as average_points,
    ROUND(
      AVG(array_length(tasks_completed, 1)),
      2
    ) as average_tasks_completed
  FROM onboarding_progress
  WHERE dismissed = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get most/least completed tasks (for optimization)
CREATE OR REPLACE FUNCTION get_task_completion_stats()
RETURNS TABLE(
  task_id TEXT,
  completion_count BIGINT,
  completion_rate NUMERIC
) AS $$
DECLARE
  total_users BIGINT;
  all_tasks TEXT[] := ARRAY[
    'complete_profile',
    'create_first_project',
    'log_time_entry',
    'upload_document',
    'invite_team_member',
    'create_daily_report',
    'connect_quickbooks',
    'create_change_order',
    'generate_report'
  ];
  task TEXT;
BEGIN
  -- Get total number of users with onboarding progress
  SELECT COUNT(*) INTO total_users
  FROM onboarding_progress
  WHERE dismissed = FALSE;

  -- Return completion stats for each task
  FOREACH task IN ARRAY all_tasks
  LOOP
    RETURN QUERY
    SELECT
      task as task_id,
      COUNT(*)::BIGINT as completion_count,
      ROUND(
        (COUNT(*)::NUMERIC / NULLIF(total_users, 0)) * 100,
        2
      ) as completion_rate
    FROM onboarding_progress
    WHERE task = ANY(tasks_completed)
    AND dismissed = FALSE;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. INITIAL DATA / COMMENTS
-- =====================================================

COMMENT ON TABLE onboarding_progress IS
  'Tracks user onboarding task completion and gamification progress';

COMMENT ON COLUMN onboarding_progress.tasks_completed IS
  'Array of completed task IDs (e.g., complete_profile, create_first_project)';

COMMENT ON COLUMN onboarding_progress.total_points IS
  'Total points earned from completed tasks (max 170 points)';

COMMENT ON COLUMN onboarding_progress.completed_at IS
  'Timestamp when all onboarding tasks were completed';

COMMENT ON COLUMN onboarding_progress.dismissed IS
  'Whether user has permanently dismissed the onboarding checklist';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000003_onboarding_progress.sql completed successfully';
  RAISE NOTICE 'Created tables: onboarding_progress';
  RAISE NOTICE 'Created indexes: 5 indexes for performance';
  RAISE NOTICE 'Created policies: 4 RLS policies';
  RAISE NOTICE 'Created functions: update_onboarding_progress_timestamp, get_onboarding_completion_rate, get_task_completion_stats';
END $$;
