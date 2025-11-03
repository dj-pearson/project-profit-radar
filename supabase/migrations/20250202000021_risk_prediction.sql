-- Risk Prediction & Analytics System
-- Migration: 20250202000021
-- Description: Predictive risk analytics for projects

-- =====================================================
-- RISK PREDICTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Risk scores (0-100)
  overall_risk_score DECIMAL(5,2) NOT NULL,
  delay_risk_score DECIMAL(5,2) DEFAULT 0,
  budget_risk_score DECIMAL(5,2) DEFAULT 0,
  safety_risk_score DECIMAL(5,2) DEFAULT 0,
  quality_risk_score DECIMAL(5,2) DEFAULT 0,

  -- Risk level
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Predictions
  predicted_delay_days INTEGER DEFAULT 0,
  predicted_cost_overrun DECIMAL(12,2) DEFAULT 0,
  predicted_completion_date DATE,

  -- Model metadata
  model_version TEXT DEFAULT 'v1.0',
  confidence_score DECIMAL(5,2) DEFAULT 50,
  prediction_date DATE DEFAULT CURRENT_DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_predictions_tenant ON risk_predictions(tenant_id);
CREATE INDEX idx_risk_predictions_project ON risk_predictions(project_id);
CREATE INDEX idx_risk_predictions_level ON risk_predictions(risk_level);
CREATE INDEX idx_risk_predictions_date ON risk_predictions(prediction_date DESC);

-- =====================================================
-- RISK FACTORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_prediction_id UUID NOT NULL REFERENCES risk_predictions(id) ON DELETE CASCADE,

  factor_type TEXT NOT NULL, -- 'weather', 'labor', 'material', 'financial', 'safety'
  factor_name TEXT NOT NULL,
  description TEXT,
  impact_score DECIMAL(5,2) NOT NULL, -- 0-100
  likelihood DECIMAL(5,2) NOT NULL, -- 0-100

  -- Mitigation
  mitigation_strategy TEXT,
  is_mitigated BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_factors_prediction ON risk_factors(risk_prediction_id);
CREATE INDEX idx_risk_factors_type ON risk_factors(factor_type);

-- =====================================================
-- RISK ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  risk_prediction_id UUID REFERENCES risk_predictions(id) ON DELETE CASCADE,

  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_alerts_tenant ON risk_alerts(tenant_id);
CREATE INDEX idx_risk_alerts_project ON risk_alerts(project_id);
CREATE INDEX idx_risk_alerts_status ON risk_alerts(status) WHERE status = 'active';
CREATE INDEX idx_risk_alerts_severity ON risk_alerts(severity);

-- =====================================================
-- RISK RECOMMENDATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS risk_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_prediction_id UUID NOT NULL REFERENCES risk_predictions(id) ON DELETE CASCADE,

  recommendation_type TEXT NOT NULL, -- 'action', 'monitoring', 'resource', 'schedule'
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Expected impact
  expected_cost_savings DECIMAL(12,2),
  expected_time_savings INTEGER, -- days
  success_probability DECIMAL(5,2),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),
  implemented_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_recommendations_prediction ON risk_recommendations(risk_prediction_id);
CREATE INDEX idx_risk_recommendations_priority ON risk_recommendations(priority);
CREATE INDEX idx_risk_recommendations_status ON risk_recommendations(status);

-- =====================================================
-- RISK HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS risk_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  prediction_date DATE NOT NULL,
  predicted_risk_score DECIMAL(5,2),
  actual_risk_score DECIMAL(5,2),

  predicted_delay_days INTEGER,
  actual_delay_days INTEGER,

  predicted_cost_overrun DECIMAL(12,2),
  actual_cost_overrun DECIMAL(12,2),

  -- Model accuracy
  prediction_accuracy DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_history_tenant ON risk_history(tenant_id);
CREATE INDEX idx_risk_history_project ON risk_history(project_id);
CREATE INDEX idx_risk_history_date ON risk_history(prediction_date DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;

-- Risk predictions policies
CREATE POLICY "Users can view their tenant's risk predictions"
  ON risk_predictions FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can create risk predictions"
  ON risk_predictions FOR INSERT
  WITH CHECK (has_tenant_access(tenant_id));

-- Risk factors policies
CREATE POLICY "Users can view risk factors"
  ON risk_factors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM risk_predictions
      WHERE risk_predictions.id = risk_factors.risk_prediction_id
      AND has_tenant_access(risk_predictions.tenant_id)
    )
  );

-- Risk alerts policies
CREATE POLICY "Users can view their tenant's risk alerts"
  ON risk_alerts FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can update risk alerts"
  ON risk_alerts FOR UPDATE
  USING (has_tenant_access(tenant_id));

-- Risk recommendations policies
CREATE POLICY "Users can view risk recommendations"
  ON risk_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM risk_predictions
      WHERE risk_predictions.id = risk_recommendations.risk_prediction_id
      AND has_tenant_access(risk_predictions.tenant_id)
    )
  );

-- Risk history policies
CREATE POLICY "Users can view their tenant's risk history"
  ON risk_history FOR SELECT
  USING (has_tenant_access(tenant_id));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Calculate overall risk score from individual scores
CREATE OR REPLACE FUNCTION calculate_overall_risk_score(
  p_delay_risk DECIMAL,
  p_budget_risk DECIMAL,
  p_safety_risk DECIMAL,
  p_quality_risk DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  -- Weighted average: budget and delay are most critical
  RETURN (
    (p_delay_risk * 0.3) +
    (p_budget_risk * 0.35) +
    (p_safety_risk * 0.20) +
    (p_quality_risk * 0.15)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Determine risk level from score
CREATE OR REPLACE FUNCTION get_risk_level(p_score DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF p_score >= 75 THEN RETURN 'critical';
  ELSIF p_score >= 50 THEN RETURN 'high';
  ELSIF p_score >= 25 THEN RETURN 'medium';
  ELSE RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get active risk alerts count for a project
CREATE OR REPLACE FUNCTION get_active_risk_alerts_count(p_project_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM risk_alerts
    WHERE project_id = p_project_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE risk_predictions IS 'AI-powered risk predictions for projects';
COMMENT ON TABLE risk_factors IS 'Individual risk factors contributing to overall risk';
COMMENT ON TABLE risk_alerts IS 'Active risk alerts requiring attention';
COMMENT ON TABLE risk_recommendations IS 'AI-generated recommendations to mitigate risks';
COMMENT ON TABLE risk_history IS 'Historical risk predictions vs actuals for model training';
