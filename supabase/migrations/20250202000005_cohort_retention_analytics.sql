-- =====================================================
-- COHORT & RETENTION ANALYTICS SYSTEM
-- =====================================================
-- Purpose: Track user cohorts, retention, and churn patterns
-- Features:
--   - Cohort definition and tracking
--   - Retention curve calculations
--   - Churn prediction data
--   - Customer lifetime value (LTV)
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_cohorts CASCADE;
DROP TABLE IF EXISTS cohort_retention CASCADE;
DROP TABLE IF EXISTS user_health_scores CASCADE;
DROP TABLE IF EXISTS churn_predictions CASCADE;
DROP TABLE IF EXISTS revenue_metrics CASCADE;

-- =====================================================
-- 1. USER COHORTS TABLE
-- =====================================================

CREATE TABLE user_cohorts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cohort identification
  signup_cohort TEXT NOT NULL, -- 'YYYY-MM' format (e.g., '2025-01')
  signup_week TEXT NOT NULL, -- 'YYYY-WW' format (e.g., '2025-W05')
  signup_date DATE NOT NULL,

  -- Trial cohort
  trial_start_cohort TEXT, -- 'YYYY-MM' when trial started
  trial_start_date DATE,

  -- Paid cohort
  paid_cohort TEXT, -- 'YYYY-MM' when first paid
  first_paid_date DATE,

  -- Cohort characteristics
  acquisition_channel TEXT, -- organic, paid, referral, etc.
  initial_plan TEXT, -- starter, professional, enterprise
  initial_mrr DECIMAL(10,2), -- Monthly recurring revenue at signup

  -- Lifecycle stage
  current_stage TEXT DEFAULT 'trial', -- trial, active, at_risk, churned, resurrected

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cohorts_signup_cohort ON user_cohorts(signup_cohort);
CREATE INDEX IF NOT EXISTS idx_cohorts_signup_week ON user_cohorts(signup_week);
CREATE INDEX IF NOT EXISTS idx_cohorts_trial_cohort ON user_cohorts(trial_start_cohort);
CREATE INDEX IF NOT EXISTS idx_cohorts_paid_cohort ON user_cohorts(paid_cohort);
CREATE INDEX IF NOT EXISTS idx_cohorts_stage ON user_cohorts(current_stage);
CREATE INDEX IF NOT EXISTS idx_cohorts_channel ON user_cohorts(acquisition_channel);

-- =====================================================
-- 2. COHORT RETENTION TABLE
-- =====================================================

CREATE TABLE cohort_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cohort info
  cohort TEXT NOT NULL, -- 'YYYY-MM' format
  cohort_type TEXT NOT NULL, -- signup, trial_start, paid

  -- Period tracking
  period_number INTEGER NOT NULL, -- 0, 1, 2, 3... (months since cohort start)
  period_date DATE NOT NULL, -- First day of the period

  -- Retention metrics
  cohort_size INTEGER NOT NULL, -- Total users in cohort
  active_users INTEGER NOT NULL, -- Still active in this period
  retained_users INTEGER NOT NULL, -- Active from period 0
  retention_rate DECIMAL(5,2), -- (retained_users / cohort_size) * 100

  -- Revenue metrics
  active_mrr DECIMAL(10,2), -- MRR from active users
  average_mrr_per_user DECIMAL(10,2), -- MRR / active_users

  -- Engagement metrics
  average_logins INTEGER, -- Avg logins per user this period
  average_projects INTEGER, -- Avg projects per user

  -- Calculated at
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cohort, cohort_type, period_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retention_cohort ON cohort_retention(cohort);
CREATE INDEX IF NOT EXISTS idx_retention_type ON cohort_retention(cohort_type);
CREATE INDEX IF NOT EXISTS idx_retention_period ON cohort_retention(period_number);
CREATE INDEX IF NOT EXISTS idx_retention_rate ON cohort_retention(retention_rate DESC);

-- =====================================================
-- 3. USER HEALTH SCORES TABLE
-- =====================================================

CREATE TABLE user_health_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Overall health (0-100)
  health_score INTEGER NOT NULL DEFAULT 50,
  health_trend TEXT, -- improving, stable, declining

  -- Component scores (0-100 each)
  engagement_score INTEGER DEFAULT 50,
  product_adoption_score INTEGER DEFAULT 50,
  support_score INTEGER DEFAULT 50,
  payment_score INTEGER DEFAULT 50,

  -- Churn risk (0-100, higher = more risk)
  churn_risk_score INTEGER DEFAULT 50,
  churn_risk_level TEXT, -- low, medium, high, critical

  -- Activity indicators
  days_since_login INTEGER DEFAULT 0,
  days_since_activity INTEGER DEFAULT 0,
  login_frequency DECIMAL(5,2), -- Logins per week
  feature_adoption_rate DECIMAL(5,2), -- % of features used

  -- Engagement indicators
  active_projects INTEGER DEFAULT 0,
  weekly_time_entries INTEGER DEFAULT 0,
  team_size INTEGER DEFAULT 1,

  -- Support indicators
  open_support_tickets INTEGER DEFAULT 0,
  avg_support_response_time INTEGER, -- Hours
  support_satisfaction_score DECIMAL(3,2), -- 1-5

  -- Payment indicators
  payment_failures INTEGER DEFAULT 0,
  days_until_renewal INTEGER,
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  months_as_customer INTEGER DEFAULT 0,

  -- Timestamps
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_health_score ON user_health_scores(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_churn_risk ON user_health_scores(churn_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_churn_risk_level ON user_health_scores(churn_risk_level);
CREATE INDEX IF NOT EXISTS idx_health_trend ON user_health_scores(health_trend);

-- =====================================================
-- 4. CHURN PREDICTIONS TABLE
-- =====================================================

CREATE TABLE churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prediction details
  prediction_date DATE NOT NULL,
  predicted_churn_date DATE,
  churn_probability DECIMAL(5,2), -- 0-100%
  confidence_level DECIMAL(5,2), -- 0-100%

  -- Contributing factors (JSON array of reasons)
  risk_factors JSONB,

  -- Recommended actions
  recommended_interventions JSONB,

  -- Outcome tracking
  actual_churned BOOLEAN,
  actual_churn_date DATE,
  intervention_taken BOOLEAN DEFAULT false,
  intervention_type TEXT,

  -- Model info
  model_version TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_predictions_user ON churn_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON churn_predictions(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_probability ON churn_predictions(churn_probability DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_churned ON churn_predictions(actual_churned);

-- =====================================================
-- 5. REVENUE METRICS TABLE
-- =====================================================

CREATE TABLE revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time period
  period_date DATE NOT NULL UNIQUE,
  period_type TEXT NOT NULL, -- daily, weekly, monthly

  -- Customer metrics
  total_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  churned_customers INTEGER DEFAULT 0,
  resurrected_customers INTEGER DEFAULT 0, -- Returned after churn

  -- Revenue metrics
  mrr DECIMAL(10,2) DEFAULT 0, -- Monthly Recurring Revenue
  arr DECIMAL(10,2) DEFAULT 0, -- Annual Recurring Revenue
  new_mrr DECIMAL(10,2) DEFAULT 0, -- MRR from new customers
  expansion_mrr DECIMAL(10,2) DEFAULT 0, -- MRR from upgrades
  contraction_mrr DECIMAL(10,2) DEFAULT 0, -- MRR from downgrades
  churned_mrr DECIMAL(10,2) DEFAULT 0, -- MRR lost to churn

  -- Growth metrics
  net_new_mrr DECIMAL(10,2) DEFAULT 0, -- new + expansion - contraction - churned
  mrr_growth_rate DECIMAL(5,2), -- % growth
  customer_growth_rate DECIMAL(5,2), -- % growth

  -- Customer lifetime value
  average_ltv DECIMAL(10,2), -- Average LTV of all customers
  average_ltv_new DECIMAL(10,2), -- Average LTV of new customers this period

  -- Churn metrics
  revenue_churn_rate DECIMAL(5,2), -- (churned_mrr / beginning_mrr) * 100
  customer_churn_rate DECIMAL(5,2), -- (churned_customers / beginning_customers) * 100

  -- Efficiency metrics
  cac DECIMAL(10,2), -- Customer Acquisition Cost (if tracked)
  ltv_cac_ratio DECIMAL(5,2), -- LTV / CAC
  payback_period_months INTEGER, -- Months to recover CAC

  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_revenue_period ON revenue_metrics(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_type ON revenue_metrics(period_type);
CREATE INDEX IF NOT EXISTS idx_revenue_mrr ON revenue_metrics(mrr DESC);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_retention ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own cohort and health data
CREATE POLICY "Users can view own cohort"
  ON user_cohorts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own health score"
  ON user_health_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all analytics
CREATE POLICY "Admins can view all cohorts"
  ON user_cohorts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can view all retention"
  ON cohort_retention FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can view all health scores"
  ON user_health_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can view all predictions"
  ON churn_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can view all revenue metrics"
  ON revenue_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Calculate cohort retention for a specific cohort
CREATE OR REPLACE FUNCTION calculate_cohort_retention(
  p_cohort TEXT,
  p_cohort_type TEXT DEFAULT 'signup'
)
RETURNS TABLE(
  period INTEGER,
  cohort_size BIGINT,
  active_users BIGINT,
  retention_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH cohort_users AS (
    SELECT
      user_id,
      CASE
        WHEN p_cohort_type = 'signup' THEN signup_cohort
        WHEN p_cohort_type = 'trial_start' THEN trial_start_cohort
        WHEN p_cohort_type = 'paid' THEN paid_cohort
      END as user_cohort
    FROM user_cohorts
    WHERE CASE
      WHEN p_cohort_type = 'signup' THEN signup_cohort = p_cohort
      WHEN p_cohort_type = 'trial_start' THEN trial_start_cohort = p_cohort
      WHEN p_cohort_type = 'paid' THEN paid_cohort = p_cohort
    END
  )
  SELECT
    cr.period_number,
    cr.cohort_size,
    cr.active_users,
    cr.retention_rate
  FROM cohort_retention cr
  WHERE cr.cohort = p_cohort
  AND cr.cohort_type = p_cohort_type
  ORDER BY cr.period_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate health score for a user
CREATE OR REPLACE FUNCTION calculate_user_health_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_engagement_score INTEGER := 0;
  v_adoption_score INTEGER := 0;
  v_support_score INTEGER := 0;
  v_payment_score INTEGER := 0;
  v_total_score INTEGER;
BEGIN
  -- Engagement score (0-100) based on activity
  SELECT
    LEAST(100, GREATEST(0,
      (CASE WHEN days_since_login <= 1 THEN 30 WHEN days_since_login <= 7 THEN 20 WHEN days_since_login <= 30 THEN 10 ELSE 0 END) +
      (CASE WHEN active_projects >= 5 THEN 25 WHEN active_projects >= 3 THEN 20 WHEN active_projects >= 1 THEN 15 ELSE 0 END) +
      (CASE WHEN weekly_time_entries >= 20 THEN 25 WHEN weekly_time_entries >= 10 THEN 20 WHEN weekly_time_entries >= 5 THEN 15 ELSE 0 END) +
      (CASE WHEN team_size >= 10 THEN 20 WHEN team_size >= 5 THEN 15 WHEN team_size >= 2 THEN 10 ELSE 5 END)
    ))
  INTO v_engagement_score
  FROM user_health_scores
  WHERE user_id = p_user_id;

  -- Adoption score (0-100) based on feature usage
  v_adoption_score := LEAST(100, COALESCE(v_engagement_score, 50)); -- Simplified

  -- Support score (0-100) - higher is better
  SELECT
    LEAST(100, GREATEST(0,
      100 - (open_support_tickets * 10) +
      (CASE WHEN support_satisfaction_score >= 4.5 THEN 20 WHEN support_satisfaction_score >= 4.0 THEN 10 ELSE 0 END)
    ))
  INTO v_support_score
  FROM user_health_scores
  WHERE user_id = p_user_id;

  v_support_score := COALESCE(v_support_score, 80); -- Default good score

  -- Payment score (0-100) - higher is better
  SELECT
    LEAST(100, GREATEST(0,
      100 - (payment_failures * 20) +
      (CASE WHEN months_as_customer >= 12 THEN 20 WHEN months_as_customer >= 6 THEN 10 ELSE 0 END)
    ))
  INTO v_payment_score
  FROM user_health_scores
  WHERE user_id = p_user_id;

  v_payment_score := COALESCE(v_payment_score, 100); -- Default perfect score

  -- Weighted average
  v_total_score := ROUND(
    (v_engagement_score * 0.35) +
    (v_adoption_score * 0.25) +
    (v_support_score * 0.20) +
    (v_payment_score * 0.20)
  );

  -- Update the health score table
  UPDATE user_health_scores
  SET
    health_score = v_total_score,
    engagement_score = v_engagement_score,
    product_adoption_score = v_adoption_score,
    support_score = v_support_score,
    payment_score = v_payment_score,
    churn_risk_score = 100 - v_total_score,
    churn_risk_level = CASE
      WHEN v_total_score >= 80 THEN 'low'
      WHEN v_total_score >= 60 THEN 'medium'
      WHEN v_total_score >= 40 THEN 'high'
      ELSE 'critical'
    END,
    health_trend = CASE
      WHEN v_total_score > health_score + 10 THEN 'improving'
      WHEN v_total_score < health_score - 10 THEN 'declining'
      ELSE 'stable'
    END,
    last_calculated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get retention curve data for visualization
CREATE OR REPLACE FUNCTION get_retention_curve(
  p_cohort_type TEXT DEFAULT 'signup',
  p_period_count INTEGER DEFAULT 12
)
RETURNS TABLE(
  cohort TEXT,
  periods JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.cohort,
    jsonb_agg(
      jsonb_build_object(
        'period', cr.period_number,
        'retention_rate', cr.retention_rate,
        'active_users', cr.active_users,
        'cohort_size', cr.cohort_size
      ) ORDER BY cr.period_number
    ) as periods
  FROM cohort_retention cr
  WHERE cr.cohort_type = p_cohort_type
  AND cr.period_number <= p_period_count
  GROUP BY cr.cohort
  ORDER BY cr.cohort DESC
  LIMIT 12; -- Last 12 cohorts
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE user_cohorts IS
  'Tracks which cohort each user belongs to for retention analysis';

COMMENT ON TABLE cohort_retention IS
  'Stores pre-calculated retention metrics for each cohort by period';

COMMENT ON TABLE user_health_scores IS
  'Real-time health scores for predicting churn and identifying at-risk customers';

COMMENT ON TABLE churn_predictions IS
  'AI/ML predictions for which customers are likely to churn';

COMMENT ON TABLE revenue_metrics IS
  'Time-series revenue metrics (MRR, ARR, churn rates, LTV)';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000005_cohort_retention_analytics.sql completed successfully';
  RAISE NOTICE 'Created tables: user_cohorts, cohort_retention, user_health_scores, churn_predictions, revenue_metrics';
  RAISE NOTICE 'Created indexes: 20+ indexes for performance';
  RAISE NOTICE 'Created policies: 9 RLS policies';
  RAISE NOTICE 'Created functions: calculate_cohort_retention, calculate_user_health_score, get_retention_curve';
END $$;
