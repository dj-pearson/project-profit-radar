-- Admin Features Foundation
-- Database schema for health scores, activity tracking, and admin operations

-- ============================================
-- ACCOUNT HEALTH & MONITORING
-- ============================================

-- Account health scores table
CREATE TABLE IF NOT EXISTS public.account_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100) NOT NULL,

  -- Component scores
  login_frequency_score INTEGER CHECK (login_frequency_score >= 0 AND login_frequency_score <= 100),
  feature_adoption_score INTEGER CHECK (feature_adoption_score >= 0 AND feature_adoption_score <= 100),
  project_activity_score INTEGER CHECK (project_activity_score >= 0 AND project_activity_score <= 100),
  team_engagement_score INTEGER CHECK (team_engagement_score >= 0 AND team_engagement_score <= 100),
  support_score INTEGER CHECK (support_score >= 0 AND support_score <= 100),
  payment_health_score INTEGER CHECK (payment_health_score >= 0 AND payment_health_score <= 100),

  -- Trend and risk assessment
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')) DEFAULT 'stable',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_account_health_company ON public.account_health_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_account_health_risk ON public.account_health_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_account_health_score ON public.account_health_scores(score);

-- ============================================
-- USER ACTIVITY TRACKING
-- ============================================

-- User activity timeline for debugging and analytics
CREATE TABLE IF NOT EXISTS public.user_activity_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Activity details
  action_type TEXT NOT NULL, -- page_view, click, api_call, error, feature_used, etc.
  action_details JSONB DEFAULT '{}'::jsonb,

  -- Error tracking
  error_details JSONB,
  error_message TEXT,
  stack_trace TEXT,

  -- Context
  url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,

  -- Performance
  duration_ms INTEGER, -- For API calls, page loads, etc.

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.user_activity_timeline(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_company ON public.user_activity_timeline(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON public.user_activity_timeline(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_errors ON public.user_activity_timeline(error_message) WHERE error_message IS NOT NULL;

-- ============================================
-- ERROR LOGGING
-- ============================================

-- Centralized error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Error information
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_code TEXT,
  stack_trace TEXT,

  -- Context
  url TEXT,
  user_action TEXT, -- What user was doing when error occurred
  component TEXT, -- Which component threw the error

  -- Environment
  browser_info JSONB,
  environment TEXT DEFAULT 'production',

  -- Metadata
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.user_profiles(id),

  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for error queries
CREATE INDEX IF NOT EXISTS idx_errors_user ON public.error_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_errors_company ON public.error_logs(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_errors_unresolved ON public.error_logs(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_errors_severity ON public.error_logs(severity, timestamp DESC);

-- ============================================
-- PERFORMANCE METRICS
-- ============================================

-- Performance monitoring
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Metric details
  metric_type TEXT NOT NULL, -- query, api_call, page_load, render
  metric_name TEXT,
  duration_ms INTEGER NOT NULL,

  -- Additional context
  query_text TEXT,
  endpoint TEXT,
  details JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_user ON public.performance_metrics(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_company ON public.performance_metrics(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_slow ON public.performance_metrics(duration_ms DESC) WHERE duration_ms > 1000;

-- ============================================
-- REVENUE METRICS
-- ============================================

-- Revenue operations tracking
CREATE TABLE IF NOT EXISTS public.revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Revenue metrics
  mrr DECIMAL(12,2) NOT NULL DEFAULT 0, -- Monthly Recurring Revenue
  arr DECIMAL(12,2) NOT NULL DEFAULT 0, -- Annual Recurring Revenue
  new_revenue DECIMAL(12,2) DEFAULT 0,
  expansion_revenue DECIMAL(12,2) DEFAULT 0, -- Upsells
  contraction_revenue DECIMAL(12,2) DEFAULT 0, -- Downgrades
  churned_revenue DECIMAL(12,2) DEFAULT 0,

  -- Metrics
  net_revenue_retention DECIMAL(5,2), -- NRR percentage
  logo_churn_rate DECIMAL(5,2), -- Customer churn rate
  revenue_churn_rate DECIMAL(5,2),

  -- Customer counts
  total_customers INTEGER,
  new_customers INTEGER,
  churned_customers INTEGER,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(period_start, period_end)
);

-- Index for revenue queries
CREATE INDEX IF NOT EXISTS idx_revenue_period ON public.revenue_metrics(period_start DESC);

-- ============================================
-- ADMIN INTERVENTIONS
-- ============================================

-- Automated admin interventions
CREATE TABLE IF NOT EXISTS public.admin_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- Intervention details
  intervention_type TEXT NOT NULL, -- email, discount, call_scheduled, trial_extension, etc.
  trigger_reason TEXT NOT NULL,
  template_used TEXT,

  -- Content
  subject TEXT,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  status TEXT CHECK (status IN ('scheduled', 'sent', 'completed', 'failed', 'cancelled')) DEFAULT 'scheduled',

  -- Timing
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  responded BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for intervention queries
CREATE INDEX IF NOT EXISTS idx_interventions_company ON public.admin_interventions(company_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON public.admin_interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_scheduled ON public.admin_interventions(scheduled_for) WHERE status = 'scheduled';

-- ============================================
-- ADMIN IMPERSONATION
-- ============================================

-- Admin impersonation audit trail
CREATE TABLE IF NOT EXISTS public.admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  impersonated_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,

  -- Session details
  reason TEXT NOT NULL, -- Required: why impersonating
  session_token TEXT UNIQUE,

  -- Actions taken during session
  actions_taken JSONB[] DEFAULT ARRAY[]::JSONB[],

  -- Timing
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for impersonation audit
CREATE INDEX IF NOT EXISTS idx_impersonation_admin ON public.admin_impersonation_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_user ON public.admin_impersonation_sessions(impersonated_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON public.admin_impersonation_sessions(ended_at) WHERE ended_at IS NULL;

-- ============================================
-- SUPPORT ENHANCEMENTS
-- ============================================

-- Support ticket context (pre-computed for fast loading)
CREATE TABLE IF NOT EXISTS public.support_ticket_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Pre-computed context
  account_health_score INTEGER,
  last_login TIMESTAMPTZ,
  recent_actions JSONB DEFAULT '[]'::jsonb, -- Last 10 user actions
  integration_status JSONB DEFAULT '{}'::jsonb, -- Status of all integrations
  feature_usage_summary JSONB DEFAULT '{}'::jsonb,
  support_history_summary JSONB DEFAULT '{}'::jsonb,

  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(ticket_id)
);

-- Support AI suggestions
CREATE TABLE IF NOT EXISTS public.support_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,

  -- Suggestion details
  suggestion_type TEXT NOT NULL, -- kb_article, auto_response, routing, category
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Content
  suggested_category TEXT,
  suggested_priority TEXT,
  suggested_content TEXT,
  kb_article_id UUID,

  -- Acceptance
  accepted BOOLEAN,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.user_profiles(id),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for support features
CREATE INDEX IF NOT EXISTS idx_ticket_context_ticket ON public.support_ticket_context(ticket_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_ticket ON public.support_suggestions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_confidence ON public.support_suggestions(confidence_score DESC);

-- ============================================
-- SESSION REPLAY (for debugging)
-- ============================================

-- Session replay data storage
CREATE TABLE IF NOT EXISTS public.session_replay_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Session info
  session_id TEXT NOT NULL,

  -- Replay events (DOM snapshots, clicks, etc.)
  events JSONB[] DEFAULT ARRAY[]::JSONB[],

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Metadata
  browser_info JSONB,
  screen_resolution TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for session replay
CREATE INDEX IF NOT EXISTS idx_session_replay_user ON public.session_replay_data(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_replay_session ON public.session_replay_data(session_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE public.account_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_replay_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_health_scores
CREATE POLICY "Root admins can view all health scores"
  ON public.account_health_scores FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can view their company health score"
  ON public.account_health_scores FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid()) AND
    public.get_user_role(auth.uid()) IN ('admin', 'root_admin')
  );

-- RLS Policies for user_activity_timeline
CREATE POLICY "Root admins can view all activity"
  ON public.user_activity_timeline FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Users can view their own activity"
  ON public.user_activity_timeline FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "All users can insert their own activity"
  ON public.user_activity_timeline FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for error_logs
CREATE POLICY "Root admins can view all errors"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "All users can insert error logs"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- RLS Policies for revenue_metrics
CREATE POLICY "Only root admins can view revenue metrics"
  ON public.revenue_metrics FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

-- RLS Policies for admin_interventions
CREATE POLICY "Root admins can manage interventions"
  ON public.admin_interventions FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

-- RLS Policies for admin_impersonation_sessions
CREATE POLICY "Root admins can view impersonation sessions"
  ON public.admin_impersonation_sessions FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Root admins can create impersonation sessions"
  ON public.admin_impersonation_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'root_admin' AND
    admin_id = auth.uid()
  );

-- RLS Policies for support tables
CREATE POLICY "Root admins can view ticket context"
  ON public.support_ticket_context FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Root admins can view support suggestions"
  ON public.support_suggestions FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

-- RLS Policies for session_replay_data
CREATE POLICY "Root admins can view session replays"
  ON public.session_replay_data FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Users can insert their own session data"
  ON public.session_replay_data FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate days since last login
CREATE OR REPLACE FUNCTION public.days_since_last_login(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    EXTRACT(DAY FROM (now() - last_login))::INTEGER,
    999
  )
  FROM public.user_profiles
  WHERE id = user_uuid;
$$;

-- Function to get active user count for a company
CREATE OR REPLACE FUNCTION public.get_active_user_count(company_uuid UUID, days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COUNT(DISTINCT user_id)::INTEGER
  FROM public.user_activity_timeline
  WHERE company_id = company_uuid
    AND timestamp > now() - (days || ' days')::INTERVAL;
$$;

-- Function to get error count for a company
CREATE OR REPLACE FUNCTION public.get_error_count(company_uuid UUID, days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.error_logs
  WHERE company_id = company_uuid
    AND timestamp > now() - (days || ' days')::INTERVAL
    AND resolved = false;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.account_health_scores IS 'Company health scores for proactive account management';
COMMENT ON TABLE public.user_activity_timeline IS 'User activity tracking for debugging and analytics';
COMMENT ON TABLE public.error_logs IS 'Centralized error tracking across the platform';
COMMENT ON TABLE public.performance_metrics IS 'Performance monitoring for queries, API calls, and page loads';
COMMENT ON TABLE public.revenue_metrics IS 'Revenue operations metrics calculated from Stripe data';
COMMENT ON TABLE public.admin_interventions IS 'Automated admin interventions and outreach';
COMMENT ON TABLE public.admin_impersonation_sessions IS 'Audit trail for admin impersonation sessions';
COMMENT ON TABLE public.support_ticket_context IS 'Pre-computed context for support tickets';
COMMENT ON TABLE public.support_suggestions IS 'AI-generated suggestions for support tickets';
COMMENT ON TABLE public.session_replay_data IS 'Session replay data for debugging';
