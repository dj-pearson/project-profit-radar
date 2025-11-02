-- User Behavior Analytics System
-- Track user events, engagement, and conversion metrics

-- User events tracking
CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT, -- for pre-signup tracking

  -- Event details
  event_name TEXT NOT NULL,
  event_category TEXT, -- acquisition, activation, engagement, conversion, retention
  event_properties JSONB,

  -- Session context
  session_id TEXT,
  page_url TEXT,
  page_title TEXT,
  referrer TEXT,

  -- Device context
  ip_address INET,
  user_agent TEXT,
  device_type TEXT, -- desktop, mobile, tablet
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,

  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_anonymous_id ON user_events(anonymous_id);
CREATE INDEX idx_user_events_name ON user_events(event_name);
CREATE INDEX idx_user_events_category ON user_events(event_category);
CREATE INDEX idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX idx_user_events_session ON user_events(session_id);
CREATE INDEX idx_user_events_user_created ON user_events(user_id, created_at DESC);

-- User engagement summary (aggregated metrics)
CREATE TABLE IF NOT EXISTS user_engagement_summary (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity counts
  projects_created INTEGER DEFAULT 0,
  time_entries_logged INTEGER DEFAULT 0,
  documents_uploaded INTEGER DEFAULT 0,
  team_members_invited INTEGER DEFAULT 0,
  reports_generated INTEGER DEFAULT 0,
  integrations_connected INTEGER DEFAULT 0,
  invoices_sent INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,

  -- Session metrics
  total_sessions INTEGER DEFAULT 0,
  total_session_time_minutes INTEGER DEFAULT 0,
  average_session_time_minutes DECIMAL(10,2) DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  days_since_signup INTEGER DEFAULT 0,
  first_session_at TIMESTAMPTZ,
  last_session_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,

  -- Feature usage flags
  used_time_tracking BOOLEAN DEFAULT false,
  used_job_costing BOOLEAN DEFAULT false,
  used_daily_reports BOOLEAN DEFAULT false,
  used_document_management BOOLEAN DEFAULT false,
  used_schedule_management BOOLEAN DEFAULT false,
  used_change_orders BOOLEAN DEFAULT false,
  used_rfis BOOLEAN DEFAULT false,
  used_integrations BOOLEAN DEFAULT false,
  used_mobile_app BOOLEAN DEFAULT false,
  used_team_collaboration BOOLEAN DEFAULT false,

  -- Engagement metrics
  engagement_score INTEGER DEFAULT 0, -- 0-100
  activation_score INTEGER DEFAULT 0, -- 0-100
  feature_adoption_rate DECIMAL(5,2) DEFAULT 0, -- percentage of features used
  activity_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,

  -- Health scoring
  health_score INTEGER DEFAULT 50, -- 0-100, 50 is neutral
  churn_risk_score INTEGER DEFAULT 0, -- 0-100, higher is more at risk
  expansion_potential_score INTEGER DEFAULT 0, -- 0-100, likelihood to upgrade

  -- Conversion milestones
  reached_aha_moment BOOLEAN DEFAULT false,
  aha_moment_reached_at TIMESTAMPTZ,
  completed_onboarding BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  invited_team_member BOOLEAN DEFAULT false,
  first_value_achieved BOOLEAN DEFAULT false,

  -- Trial-specific
  is_trial BOOLEAN DEFAULT false,
  trial_days_remaining INTEGER,
  trial_engagement_level TEXT, -- low, medium, high

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_engagement_engagement_score ON user_engagement_summary(engagement_score DESC);
CREATE INDEX idx_engagement_health_score ON user_engagement_summary(health_score DESC);
CREATE INDEX idx_engagement_churn_risk ON user_engagement_summary(churn_risk_score DESC);
CREATE INDEX idx_engagement_last_active ON user_engagement_summary(last_active_at DESC);
CREATE INDEX idx_engagement_is_trial ON user_engagement_summary(is_trial);

-- Conversion events (funnel tracking)
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT,

  -- Event type
  event_type TEXT NOT NULL, -- landed, viewed_pricing, signup_started, signup_completed, trial_activated, project_created, upgrade_viewed, payment_started, trial_converted, churned, etc.
  event_step INTEGER, -- order in funnel
  funnel_name TEXT, -- which funnel this belongs to

  -- Context
  source_page TEXT,
  referrer TEXT,
  device_type TEXT,

  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Value
  event_value DECIMAL(10,2), -- monetary value if applicable
  currency TEXT DEFAULT 'USD',

  -- Additional data
  event_metadata JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversion_events_user ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX idx_conversion_events_funnel ON conversion_events(funnel_name, event_step);
CREATE INDEX idx_conversion_events_created_at ON conversion_events(created_at DESC);

-- User attribution (first and last touch)
CREATE TABLE IF NOT EXISTS user_attribution (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- First touch attribution
  first_touch_utm_source TEXT,
  first_touch_utm_medium TEXT,
  first_touch_utm_campaign TEXT,
  first_touch_utm_content TEXT,
  first_touch_utm_term TEXT,
  first_touch_landing_page TEXT,
  first_touch_referrer TEXT,
  first_touch_at TIMESTAMPTZ,

  -- Last touch attribution
  last_touch_utm_source TEXT,
  last_touch_utm_medium TEXT,
  last_touch_utm_campaign TEXT,
  last_touch_utm_content TEXT,
  last_touch_utm_term TEXT,
  last_touch_landing_page TEXT,
  last_touch_referrer TEXT,
  last_touch_at TIMESTAMPTZ,

  -- Touch points
  total_touchpoints INTEGER DEFAULT 1,
  touchpoint_history JSONB, -- array of all touchpoints

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_attribution_first_source ON user_attribution(first_touch_utm_source);
CREATE INDEX idx_user_attribution_first_medium ON user_attribution(first_touch_utm_medium);
CREATE INDEX idx_user_attribution_last_source ON user_attribution(last_touch_utm_source);

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feature details
  feature_name TEXT NOT NULL,
  feature_category TEXT, -- core, advanced, integration, etc.

  -- Usage details
  first_used_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 1,
  total_time_spent_minutes INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, feature_name)
);

-- Indexes
CREATE INDEX idx_feature_usage_user ON feature_usage(user_id);
CREATE INDEX idx_feature_usage_feature ON feature_usage(feature_name);
CREATE INDEX idx_feature_usage_last_used ON feature_usage(last_used_at DESC);

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_summary RECORD;
BEGIN
  SELECT * INTO v_summary FROM user_engagement_summary WHERE user_id = p_user_id;

  IF v_summary IS NULL THEN
    RETURN 0;
  END IF;

  -- Activity-based points (max 40 points)
  v_score := v_score + LEAST(v_summary.projects_created * 5, 20);
  v_score := v_score + LEAST(v_summary.time_entries_logged / 10, 10);
  v_score := v_score + LEAST(v_summary.documents_uploaded / 5, 5);
  v_score := v_score + LEAST(v_summary.team_members_invited * 5, 5);

  -- Session-based points (max 20 points)
  v_score := v_score + LEAST(v_summary.days_active, 10);
  v_score := v_score + LEAST(v_summary.total_sessions / 2, 10);

  -- Feature adoption points (max 30 points)
  v_score := v_score + (v_summary.feature_adoption_rate * 0.3)::INTEGER;

  -- Streak bonus (max 10 points)
  v_score := v_score + LEAST(v_summary.activity_streak_days, 10);

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate health score
CREATE OR REPLACE FUNCTION calculate_health_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 50; -- Start neutral
  v_summary RECORD;
  v_days_since_last_active INTEGER;
BEGIN
  SELECT * INTO v_summary FROM user_engagement_summary WHERE user_id = p_user_id;

  IF v_summary IS NULL THEN
    RETURN 50;
  END IF;

  -- Recent activity (±30 points)
  v_days_since_last_active := EXTRACT(EPOCH FROM (NOW() - v_summary.last_active_at)) / 86400;

  IF v_days_since_last_active <= 1 THEN
    v_score := v_score + 30;
  ELSIF v_days_since_last_active <= 3 THEN
    v_score := v_score + 20;
  ELSIF v_days_since_last_active <= 7 THEN
    v_score := v_score + 10;
  ELSIF v_days_since_last_active <= 14 THEN
    v_score := v_score + 0;
  ELSIF v_days_since_last_active <= 30 THEN
    v_score := v_score - 20;
  ELSE
    v_score := v_score - 40;
  END IF;

  -- Engagement level (±20 points)
  IF v_summary.engagement_score >= 70 THEN
    v_score := v_score + 20;
  ELSIF v_summary.engagement_score >= 40 THEN
    v_score := v_score + 10;
  ELSIF v_summary.engagement_score < 20 THEN
    v_score := v_score - 20;
  END IF;

  RETURN GREATEST(0, LEAST(v_score, 100));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track user event and update summaries
CREATE OR REPLACE FUNCTION track_user_event(
  p_user_id UUID,
  p_event_name TEXT,
  p_event_properties JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insert event
  INSERT INTO user_events (user_id, event_name, event_properties)
  VALUES (p_user_id, p_event_name, p_event_properties)
  RETURNING id INTO v_event_id;

  -- Update engagement summary based on event type
  INSERT INTO user_engagement_summary (user_id, last_active_at)
  VALUES (p_user_id, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    projects_created = CASE WHEN p_event_name = 'project_created' THEN user_engagement_summary.projects_created + 1 ELSE user_engagement_summary.projects_created END,
    time_entries_logged = CASE WHEN p_event_name = 'time_entry_logged' THEN user_engagement_summary.time_entries_logged + 1 ELSE user_engagement_summary.time_entries_logged END,
    documents_uploaded = CASE WHEN p_event_name = 'document_uploaded' THEN user_engagement_summary.documents_uploaded + 1 ELSE user_engagement_summary.documents_uploaded END,
    team_members_invited = CASE WHEN p_event_name = 'team_member_invited' THEN user_engagement_summary.team_members_invited + 1 ELSE user_engagement_summary.team_members_invited END,
    reports_generated = CASE WHEN p_event_name = 'report_generated' THEN user_engagement_summary.reports_generated + 1 ELSE user_engagement_summary.reports_generated END,

    used_time_tracking = CASE WHEN p_event_name = 'time_entry_logged' THEN true ELSE user_engagement_summary.used_time_tracking END,
    used_job_costing = CASE WHEN p_event_name = 'job_costing_viewed' THEN true ELSE user_engagement_summary.used_job_costing END,
    used_daily_reports = CASE WHEN p_event_name = 'daily_report_created' THEN true ELSE user_engagement_summary.used_daily_reports END,
    used_document_management = CASE WHEN p_event_name = 'document_uploaded' THEN true ELSE user_engagement_summary.used_document_management END,

    last_active_at = NOW(),
    updated_at = NOW();

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update engagement summary when events are tracked
CREATE OR REPLACE FUNCTION update_engagement_from_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last active timestamp
  UPDATE user_engagement_summary
  SET
    last_active_at = NEW.created_at,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;

  -- If no summary exists, create one
  INSERT INTO user_engagement_summary (user_id, last_active_at)
  VALUES (NEW.user_id, NEW.created_at)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_engagement_from_event
  AFTER INSERT ON user_events
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION update_engagement_from_event();

-- Triggers for updated_at
CREATE TRIGGER update_user_engagement_summary_updated_at BEFORE UPDATE ON user_engagement_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_usage_updated_at BEFORE UPDATE ON feature_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_attribution_updated_at BEFORE UPDATE ON user_attribution
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can track all events"
  ON user_events FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Users can view their own events"
  ON user_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their engagement summary"
  ON user_engagement_summary FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage engagement summaries"
  ON user_engagement_summary FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Users can view their attribution"
  ON user_attribution FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage attribution"
  ON user_attribution FOR ALL
  TO service_role
  USING (true);

-- Anonymous users can track conversion events (for funnel)
CREATE POLICY "Anyone can track conversion events"
  ON conversion_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
