-- AI-Powered Estimating & Bid Optimization
-- Migration: 20250202000017
-- Description: AI estimating with ML predictions and historical analysis

-- =====================================================
-- AI ESTIMATES TABLE
-- =====================================================
-- Stores AI-generated estimates with confidence scores

CREATE TABLE IF NOT EXISTS ai_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Estimate basics
  estimate_name TEXT NOT NULL,
  project_type TEXT NOT NULL, -- 'residential', 'commercial', 'industrial'
  square_footage DECIMAL(12,2),
  location_zip TEXT,
  estimated_duration_days INTEGER,

  -- AI predictions
  predicted_labor_hours DECIMAL(10,2),
  predicted_labor_cost DECIMAL(12,2),
  predicted_material_cost DECIMAL(12,2),
  predicted_equipment_cost DECIMAL(12,2),
  predicted_subcontractor_cost DECIMAL(12,2),
  predicted_total_cost DECIMAL(12,2),

  -- Confidence and recommendations
  confidence_score DECIMAL(5,2), -- 0-100%
  recommended_markup DECIMAL(5,2), -- Percentage
  recommended_bid_amount DECIMAL(12,2),
  win_probability DECIMAL(5,2), -- 0-100%

  -- Data sources
  similar_projects_count INTEGER DEFAULT 0,
  training_data_quality TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
  model_version TEXT DEFAULT 'v1.0',

  -- Status and metadata
  status TEXT DEFAULT 'draft', -- 'draft', 'reviewed', 'approved', 'submitted', 'won', 'lost'
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  outcome TEXT, -- 'won', 'lost', 'withdrawn'
  actual_cost DECIMAL(12,2), -- Actual cost if won

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_estimates_tenant ON ai_estimates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_estimates_project ON ai_estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_estimates_user ON ai_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_estimates_status ON ai_estimates(status);
CREATE INDEX IF NOT EXISTS idx_ai_estimates_created ON ai_estimates(created_at DESC);

-- RLS Policies
ALTER TABLE ai_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's AI estimates"
  ON ai_estimates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = ai_estimates.tenant_id
    )
  );

CREATE POLICY "Users can create AI estimates"
  ON ai_estimates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = ai_estimates.tenant_id
    )
  );

CREATE POLICY "Users can update their tenant's AI estimates"
  ON ai_estimates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = ai_estimates.tenant_id
    )
  );

-- =====================================================
-- ESTIMATE PREDICTIONS TABLE
-- =====================================================
-- Stores individual ML predictions for line items

CREATE TABLE IF NOT EXISTS estimate_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_estimate_id UUID NOT NULL REFERENCES ai_estimates(id) ON DELETE CASCADE,

  -- Line item details
  category TEXT NOT NULL, -- 'labor', 'materials', 'equipment', 'subcontractor', 'other'
  item_name TEXT NOT NULL,
  item_description TEXT,

  -- Predictions
  predicted_quantity DECIMAL(12,2),
  predicted_unit_cost DECIMAL(12,2),
  predicted_total_cost DECIMAL(12,2),
  confidence_score DECIMAL(5,2),

  -- Actual values (if available)
  actual_quantity DECIMAL(12,2),
  actual_unit_cost DECIMAL(12,2),
  actual_total_cost DECIMAL(12,2),

  -- Model metadata
  prediction_model TEXT DEFAULT 'linear_regression',
  feature_importance JSONB, -- Which factors influenced this prediction

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimate_predictions_ai_estimate ON estimate_predictions(ai_estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_predictions_category ON estimate_predictions(category);

-- RLS Policies
ALTER TABLE estimate_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their AI estimate predictions"
  ON estimate_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_estimates
      JOIN user_profiles ON user_profiles.tenant_id = ai_estimates.tenant_id
      WHERE ai_estimates.id = estimate_predictions.ai_estimate_id
      AND user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can create estimate predictions"
  ON estimate_predictions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_estimates
      JOIN user_profiles ON user_profiles.tenant_id = ai_estimates.tenant_id
      WHERE ai_estimates.id = estimate_predictions.ai_estimate_id
      AND user_profiles.id = auth.uid()
    )
  );

-- =====================================================
-- HISTORICAL BID DATA TABLE
-- =====================================================
-- Training data for ML models

CREATE TABLE IF NOT EXISTS historical_bid_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Project characteristics (features)
  project_type TEXT NOT NULL,
  square_footage DECIMAL(12,2),
  location_zip TEXT,
  duration_days INTEGER,
  num_stories INTEGER,
  year_built INTEGER,
  renovation BOOLEAN DEFAULT FALSE,

  -- Costs (labels)
  total_labor_hours DECIMAL(10,2),
  total_labor_cost DECIMAL(12,2),
  total_material_cost DECIMAL(12,2),
  total_equipment_cost DECIMAL(12,2),
  total_subcontractor_cost DECIMAL(12,2),
  total_cost DECIMAL(12,2),

  -- Bid information
  bid_amount DECIMAL(12,2),
  markup_percentage DECIMAL(5,2),
  won BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Quality indicators
  is_complete BOOLEAN DEFAULT FALSE, -- Has all required data
  is_verified BOOLEAN DEFAULT FALSE, -- Manually verified accuracy
  data_quality_score DECIMAL(5,2), -- 0-100%

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_historical_bid_data_tenant ON historical_bid_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_historical_bid_data_project ON historical_bid_data(project_id);
CREATE INDEX IF NOT EXISTS idx_historical_bid_data_type ON historical_bid_data(project_type);
CREATE INDEX IF NOT EXISTS idx_historical_bid_data_complete ON historical_bid_data(is_complete) WHERE is_complete = TRUE;
CREATE INDEX IF NOT EXISTS idx_historical_bid_data_quality ON historical_bid_data(data_quality_score DESC);

-- RLS Policies
ALTER TABLE historical_bid_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's historical bid data"
  ON historical_bid_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = historical_bid_data.tenant_id
    )
  );

CREATE POLICY "Users can create historical bid data"
  ON historical_bid_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = historical_bid_data.tenant_id
    )
  );

-- =====================================================
-- MARKET PRICING DATA TABLE
-- =====================================================
-- Market intelligence for competitive pricing

CREATE TABLE IF NOT EXISTS market_pricing_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic scope
  location_zip TEXT NOT NULL,
  location_city TEXT,
  location_state TEXT,
  location_region TEXT, -- 'northeast', 'southeast', 'midwest', 'southwest', 'west'

  -- Pricing data
  project_type TEXT NOT NULL,
  average_cost_per_sqft DECIMAL(10,2),
  median_cost_per_sqft DECIMAL(10,2),
  low_cost_per_sqft DECIMAL(10,2),
  high_cost_per_sqft DECIMAL(10,2),

  -- Labor rates
  average_labor_rate_per_hour DECIMAL(8,2),
  skilled_labor_rate DECIMAL(8,2),
  unskilled_labor_rate DECIMAL(8,2),

  -- Material pricing trends
  material_price_index DECIMAL(10,2), -- Base 100
  material_price_trend TEXT DEFAULT 'stable', -- 'declining', 'stable', 'rising'

  -- Competitive intel
  average_markup_percentage DECIMAL(5,2),
  typical_win_rate DECIMAL(5,2),
  market_demand TEXT DEFAULT 'moderate', -- 'low', 'moderate', 'high', 'very_high'

  -- Data freshness
  data_source TEXT, -- 'internal', 'industry_report', 'third_party'
  sample_size INTEGER,
  confidence_level DECIMAL(5,2),
  valid_from DATE,
  valid_to DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_pricing_zip ON market_pricing_data(location_zip);
CREATE INDEX IF NOT EXISTS idx_market_pricing_type ON market_pricing_data(project_type);
CREATE INDEX IF NOT EXISTS idx_market_pricing_valid ON market_pricing_data(valid_from, valid_to);

-- RLS Policies (Public read access for market data)
ALTER TABLE market_pricing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view market pricing data"
  ON market_pricing_data FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage market pricing data"
  ON market_pricing_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- =====================================================
-- ESTIMATE TEMPLATES TABLE
-- =====================================================
-- AI-generated estimate templates

CREATE TABLE IF NOT EXISTS estimate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system templates

  -- Template basics
  template_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- Available to all tenants
  is_ai_generated BOOLEAN DEFAULT FALSE,

  -- Template content
  line_items JSONB NOT NULL, -- Array of line item templates
  default_markup DECIMAL(5,2),
  notes TEXT,

  -- Usage statistics
  usage_count INTEGER DEFAULT 0,
  average_accuracy DECIMAL(5,2), -- How accurate was this template historically

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimate_templates_tenant ON estimate_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_type ON estimate_templates(project_type);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_public ON estimate_templates(is_public) WHERE is_public = TRUE;

-- RLS Policies
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public and their tenant's templates"
  ON estimate_templates FOR SELECT
  USING (
    is_public = TRUE OR
    tenant_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = estimate_templates.tenant_id
    )
  );

CREATE POLICY "Users can create templates for their tenant"
  ON estimate_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = estimate_templates.tenant_id
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_estimate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_estimates_updated_at
  BEFORE UPDATE ON ai_estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_estimate_updated_at();

CREATE TRIGGER estimate_predictions_updated_at
  BEFORE UPDATE ON estimate_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_estimate_updated_at();

CREATE TRIGGER historical_bid_data_updated_at
  BEFORE UPDATE ON historical_bid_data
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_estimate_updated_at();

CREATE TRIGGER market_pricing_data_updated_at
  BEFORE UPDATE ON market_pricing_data
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_estimate_updated_at();

CREATE TRIGGER estimate_templates_updated_at
  BEFORE UPDATE ON estimate_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_estimate_updated_at();

-- Function to calculate win rate by project type
CREATE OR REPLACE FUNCTION get_win_rate_by_project_type(
  p_tenant_id UUID,
  p_project_type TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_win_rate DECIMAL;
BEGIN
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 0.0
      ELSE (COUNT(*) FILTER (WHERE won = TRUE)::DECIMAL / COUNT(*)::DECIMAL) * 100
    END INTO v_win_rate
  FROM historical_bid_data
  WHERE tenant_id = p_tenant_id
    AND project_type = p_project_type
    AND is_complete = TRUE;

  RETURN COALESCE(v_win_rate, 0.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get similar projects for training
CREATE OR REPLACE FUNCTION get_similar_projects(
  p_tenant_id UUID,
  p_project_type TEXT,
  p_square_footage DECIMAL,
  p_location_zip TEXT
)
RETURNS TABLE (
  id UUID,
  similarity_score DECIMAL,
  total_cost DECIMAL,
  bid_amount DECIMAL,
  won BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hbd.id,
    (
      -- Simple similarity calculation (can be improved with ML)
      CASE WHEN hbd.project_type = p_project_type THEN 40.0 ELSE 0.0 END +
      CASE WHEN hbd.location_zip = p_location_zip THEN 30.0 ELSE 0.0 END +
      CASE
        WHEN ABS(hbd.square_footage - p_square_footage) < 500 THEN 30.0
        WHEN ABS(hbd.square_footage - p_square_footage) < 1000 THEN 20.0
        WHEN ABS(hbd.square_footage - p_square_footage) < 2000 THEN 10.0
        ELSE 0.0
      END
    ) AS similarity_score,
    hbd.total_cost,
    hbd.bid_amount,
    hbd.won
  FROM historical_bid_data hbd
  WHERE hbd.tenant_id = p_tenant_id
    AND hbd.is_complete = TRUE
    AND hbd.data_quality_score > 50.0
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Seed market pricing data for common project types and regions
INSERT INTO market_pricing_data (location_region, project_type, average_cost_per_sqft, median_cost_per_sqft, low_cost_per_sqft, high_cost_per_sqft, average_labor_rate_per_hour, material_price_index, average_markup_percentage, typical_win_rate, valid_from, valid_to)
VALUES
  -- Residential Construction
  ('northeast', 'residential_new', 150.00, 145.00, 120.00, 200.00, 45.00, 105.2, 20.0, 35.0, '2025-01-01', '2025-12-31'),
  ('southeast', 'residential_new', 110.00, 105.00, 90.00, 150.00, 35.00, 102.8, 18.0, 40.0, '2025-01-01', '2025-12-31'),
  ('midwest', 'residential_new', 120.00, 115.00, 95.00, 160.00, 38.00, 103.5, 19.0, 38.0, '2025-01-01', '2025-12-31'),
  ('southwest', 'residential_new', 125.00, 120.00, 100.00, 170.00, 40.00, 104.1, 19.5, 36.0, '2025-01-01', '2025-12-31'),
  ('west', 'residential_new', 180.00, 175.00, 150.00, 250.00, 55.00, 108.9, 22.0, 32.0, '2025-01-01', '2025-12-31'),

  -- Residential Renovation
  ('northeast', 'residential_renovation', 120.00, 115.00, 95.00, 160.00, 45.00, 105.2, 25.0, 45.0, '2025-01-01', '2025-12-31'),
  ('southeast', 'residential_renovation', 90.00, 85.00, 70.00, 120.00, 35.00, 102.8, 23.0, 50.0, '2025-01-01', '2025-12-31'),
  ('midwest', 'residential_renovation', 95.00, 90.00, 75.00, 130.00, 38.00, 103.5, 24.0, 48.0, '2025-01-01', '2025-12-31'),
  ('southwest', 'residential_renovation', 100.00, 95.00, 80.00, 140.00, 40.00, 104.1, 24.5, 46.0, '2025-01-01', '2025-12-31'),
  ('west', 'residential_renovation', 145.00, 140.00, 120.00, 200.00, 55.00, 108.9, 27.0, 42.0, '2025-01-01', '2025-12-31'),

  -- Commercial Construction
  ('northeast', 'commercial_new', 200.00, 190.00, 160.00, 280.00, 50.00, 106.5, 15.0, 25.0, '2025-01-01', '2025-12-31'),
  ('southeast', 'commercial_new', 145.00, 140.00, 120.00, 200.00, 38.00, 103.2, 13.0, 30.0, '2025-01-01', '2025-12-31'),
  ('midwest', 'commercial_new', 155.00, 150.00, 130.00, 215.00, 42.00, 104.0, 14.0, 28.0, '2025-01-01', '2025-12-31'),
  ('southwest', 'commercial_new', 165.00, 160.00, 140.00, 230.00, 45.00, 104.8, 14.5, 27.0, '2025-01-01', '2025-12-31'),
  ('west', 'commercial_new', 235.00, 225.00, 190.00, 320.00, 60.00, 110.2, 17.0, 22.0, '2025-01-01', '2025-12-31');

-- Create system-wide estimate templates
INSERT INTO estimate_templates (tenant_id, template_name, project_type, description, is_public, is_ai_generated, line_items, default_markup)
VALUES
  (NULL, 'Standard Residential New Construction', 'residential_new', 'Template for standard single-family home construction', TRUE, TRUE,
   '[
     {"category": "labor", "item": "Foundation", "unit": "sqft", "rate": 8.50},
     {"category": "labor", "item": "Framing", "unit": "sqft", "rate": 12.00},
     {"category": "labor", "item": "Roofing", "unit": "sqft", "rate": 6.50},
     {"category": "labor", "item": "Electrical", "unit": "sqft", "rate": 4.50},
     {"category": "labor", "item": "Plumbing", "unit": "sqft", "rate": 5.00},
     {"category": "labor", "item": "HVAC", "unit": "sqft", "rate": 4.00},
     {"category": "labor", "item": "Drywall", "unit": "sqft", "rate": 3.50},
     {"category": "labor", "item": "Finishing", "unit": "sqft", "rate": 10.00},
     {"category": "materials", "item": "Lumber", "unit": "sqft", "rate": 15.00},
     {"category": "materials", "item": "Windows/Doors", "unit": "sqft", "rate": 8.00},
     {"category": "materials", "item": "Roofing Materials", "unit": "sqft", "rate": 4.50},
     {"category": "materials", "item": "Drywall", "unit": "sqft", "rate": 2.00},
     {"category": "materials", "item": "Paint", "unit": "sqft", "rate": 1.50},
     {"category": "materials", "item": "Flooring", "unit": "sqft", "rate": 6.00}
   ]'::jsonb, 20.0);

COMMENT ON TABLE ai_estimates IS 'AI-generated project estimates with confidence scores and win probability';
COMMENT ON TABLE estimate_predictions IS 'Individual line item predictions from ML models';
COMMENT ON TABLE historical_bid_data IS 'Training data for ML models - past project costs and outcomes';
COMMENT ON TABLE market_pricing_data IS 'Market intelligence for competitive pricing recommendations';
COMMENT ON TABLE estimate_templates IS 'Reusable estimate templates with common line items';
