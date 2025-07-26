-- Enhanced Lead Intelligence & Scoring System
-- Adding tables and features for advanced lead intelligence

-- Lead Behavioral Tracking
CREATE TABLE IF NOT EXISTS lead_behavioral_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Engagement Metrics
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  website_visits INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  document_downloads INTEGER DEFAULT 0,
  form_submissions INTEGER DEFAULT 0,
  phone_calls INTEGER DEFAULT 0,
  meeting_requests INTEGER DEFAULT 0,
  
  -- Behavioral Patterns
  last_activity_at TIMESTAMP WITH TIME ZONE,
  activity_frequency DECIMAL(5,2) DEFAULT 0, -- activities per week
  engagement_score DECIMAL(5,2) DEFAULT 0,
  response_time_avg INTEGER DEFAULT 0, -- minutes
  
  -- Content Interaction
  content_interests JSONB DEFAULT '[]'::jsonb,
  preferred_communication TEXT DEFAULT 'email',
  best_contact_time TEXT, -- morning/afternoon/evening
  time_zone TEXT,
  
  -- Device & Location
  device_types JSONB DEFAULT '[]'::jsonb,
  locations JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lead Source Attribution & ROI
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL, -- organic, paid, referral, direct, etc.
  source_category TEXT, -- search, social, email, etc.
  
  -- Campaign Details
  campaign_name TEXT,
  campaign_id TEXT,
  medium TEXT,
  content TEXT,
  term TEXT,
  
  -- ROI Tracking
  cost_per_lead DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  average_deal_size DECIMAL(15,2) DEFAULT 0,
  roi_percentage DECIMAL(8,2) DEFAULT 0,
  
  -- Attribution Settings
  attribution_model TEXT DEFAULT 'last_touch', -- first_touch, last_touch, multi_touch
  attribution_window_days INTEGER DEFAULT 30,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lead Attribution History
CREATE TABLE IF NOT EXISTS lead_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES lead_sources(id) ON DELETE CASCADE,
  
  -- Attribution Details
  attribution_type TEXT NOT NULL, -- first_touch, last_touch, assisted
  attribution_weight DECIMAL(5,2) DEFAULT 1.0,
  touchpoint_sequence INTEGER,
  
  -- Conversion Data
  converted_to_opportunity BOOLEAN DEFAULT false,
  converted_to_customer BOOLEAN DEFAULT false,
  conversion_value DECIMAL(15,2) DEFAULT 0,
  
  -- Timing
  touched_at TIMESTAMP WITH TIME ZONE NOT NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Context
  page_url TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Predictive Analytics Models
CREATE TABLE IF NOT EXISTS predictive_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- lead_scoring, deal_closure, churn_prediction
  model_version TEXT DEFAULT '1.0',
  
  -- Model Configuration
  algorithm TEXT, -- random_forest, logistic_regression, neural_network
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  weights JSONB DEFAULT '{}'::jsonb,
  thresholds JSONB DEFAULT '{}'::jsonb,
  
  -- Performance Metrics
  accuracy DECIMAL(5,2),
  precision_score DECIMAL(5,2),
  recall_score DECIMAL(5,2),
  f1_score DECIMAL(5,2),
  
  -- Training Data
  training_data_size INTEGER,
  training_date TIMESTAMP WITH TIME ZONE,
  last_retrained TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_production BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enhanced Lead Scoring with AI
CREATE TABLE IF NOT EXISTS ai_lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  model_id UUID REFERENCES predictive_models(id),
  
  -- Scoring
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  confidence_level DECIMAL(5,2) DEFAULT 0,
  
  -- Score Components
  demographic_score INTEGER DEFAULT 0,
  behavioral_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  fit_score INTEGER DEFAULT 0,
  intent_score INTEGER DEFAULT 0,
  timing_score INTEGER DEFAULT 0,
  
  -- Predictions
  conversion_probability DECIMAL(5,2) DEFAULT 0,
  estimated_deal_size DECIMAL(15,2) DEFAULT 0,
  estimated_close_time_days INTEGER DEFAULT 0,
  churn_risk DECIMAL(5,2) DEFAULT 0,
  
  -- AI Insights
  key_insights JSONB DEFAULT '[]'::jsonb,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  opportunities JSONB DEFAULT '[]'::jsonb,
  next_best_actions JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  score_explanation TEXT,
  feature_importance JSONB DEFAULT '{}'::jsonb,
  model_version TEXT,
  
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lead Nurturing Campaigns
CREATE TABLE IF NOT EXISTS lead_nurturing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  campaign_name TEXT NOT NULL,
  description TEXT,
  
  -- Targeting
  target_segments JSONB DEFAULT '[]'::jsonb,
  score_threshold INTEGER DEFAULT 0,
  behavioral_triggers JSONB DEFAULT '[]'::jsonb,
  
  -- Campaign Flow
  campaign_type TEXT DEFAULT 'drip', -- drip, trigger_based, dynamic
  total_steps INTEGER DEFAULT 0,
  
  -- Timing
  start_delay_hours INTEGER DEFAULT 0,
  step_delay_hours INTEGER DEFAULT 24,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  auto_enrollment BOOLEAN DEFAULT false,
  stop_on_reply BOOLEAN DEFAULT true,
  stop_on_conversion BOOLEAN DEFAULT true,
  
  -- Performance
  enrollment_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Campaign Steps
CREATE TABLE IF NOT EXISTS nurturing_campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES lead_nurturing_campaigns(id) ON DELETE CASCADE,
  
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL, -- email, sms, task, call, linkedin
  
  -- Content
  subject_line TEXT,
  content TEXT,
  template_id UUID,
  
  -- Conditions
  send_conditions JSONB DEFAULT '{}'::jsonb,
  wait_conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Timing
  delay_value INTEGER DEFAULT 0,
  delay_unit TEXT DEFAULT 'hours', -- minutes, hours, days, weeks
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  track_opens BOOLEAN DEFAULT true,
  track_clicks BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lead Nurturing Enrollments
CREATE TABLE IF NOT EXISTS lead_nurturing_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES lead_nurturing_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, paused, completed, stopped
  current_step INTEGER DEFAULT 1,
  
  -- Progress
  steps_completed INTEGER DEFAULT 0,
  last_step_sent_at TIMESTAMP WITH TIME ZONE,
  next_step_scheduled_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  
  -- Outcomes
  converted BOOLEAN DEFAULT false,
  conversion_step INTEGER,
  conversion_date TIMESTAMP WITH TIME ZONE,
  stop_reason TEXT,
  
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lead Qualification Workflows
CREATE TABLE IF NOT EXISTS lead_qualification_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  workflow_name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger Conditions
  trigger_events JSONB DEFAULT '[]'::jsonb,
  qualification_criteria JSONB DEFAULT '{}'::jsonb,
  
  -- Workflow Steps
  workflow_steps JSONB DEFAULT '[]'::jsonb,
  
  -- Outcomes
  qualified_status TEXT DEFAULT 'qualified',
  disqualified_status TEXT DEFAULT 'disqualified',
  auto_route_qualified BOOLEAN DEFAULT false,
  auto_route_to_user UUID REFERENCES auth.users(id),
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add foreign key to existing leads table for enhanced features
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES lead_sources(id),
ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'unqualified',
ADD COLUMN IF NOT EXISTS qualification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS nurturing_status TEXT DEFAULT 'not_enrolled',
ADD COLUMN IF NOT EXISTS intent_signals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'cold'; -- cold, warm, hot

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_behavioral_data_lead_activity ON lead_behavioral_data(lead_id, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_lead_attribution_lead_source ON lead_attribution(lead_id, source_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_scores_lead_score ON ai_lead_scores(lead_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_lead_scores_conversion_prob ON ai_lead_scores(lead_id, conversion_probability DESC);
CREATE INDEX IF NOT EXISTS idx_nurturing_enrollments_campaign_status ON lead_nurturing_enrollments(campaign_id, status);

-- Enable RLS
ALTER TABLE lead_behavioral_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_nurturing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurturing_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_nurturing_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualification_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage company lead behavioral data" ON lead_behavioral_data
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company lead sources" ON lead_sources
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can view company lead attribution" ON lead_attribution
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage predictive models" ON predictive_models
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view company AI lead scores" ON ai_lead_scores
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "System can manage AI lead scores" ON ai_lead_scores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage company nurturing campaigns" ON lead_nurturing_campaigns
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage campaign steps" ON nurturing_campaign_steps
  FOR ALL USING (EXISTS (
    SELECT 1 FROM lead_nurturing_campaigns lnc 
    WHERE lnc.id = nurturing_campaign_steps.campaign_id 
    AND lnc.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Users can manage lead enrollments" ON lead_nurturing_enrollments
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage qualification workflows" ON lead_qualification_workflows
  FOR ALL USING (company_id = get_user_company(auth.uid()));

-- Add update triggers
CREATE TRIGGER update_lead_behavioral_data_updated_at
  BEFORE UPDATE ON lead_behavioral_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_sources_updated_at
  BEFORE UPDATE ON lead_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_models_updated_at
  BEFORE UPDATE ON predictive_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nurturing_campaigns_updated_at
  BEFORE UPDATE ON lead_nurturing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nurturing_campaign_steps_updated_at
  BEFORE UPDATE ON nurturing_campaign_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nurturing_enrollments_updated_at
  BEFORE UPDATE ON lead_nurturing_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qualification_workflows_updated_at
  BEFORE UPDATE ON lead_qualification_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced lead scoring function with AI features
CREATE OR REPLACE FUNCTION calculate_enhanced_lead_score(p_lead_id UUID)
RETURNS JSONB AS $$
DECLARE
  lead_data RECORD;
  behavioral_data RECORD;
  score JSONB := '{}';
  overall_score INTEGER := 0;
  demographic_score INTEGER := 0;
  behavioral_score INTEGER := 0;
  engagement_score INTEGER := 0;
  fit_score INTEGER := 0;
  intent_score INTEGER := 0;
  timing_score INTEGER := 0;
BEGIN
  -- Get lead data
  SELECT * INTO lead_data FROM leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lead not found');
  END IF;
  
  -- Get behavioral data
  SELECT * INTO behavioral_data FROM lead_behavioral_data WHERE lead_id = p_lead_id;
  
  -- Calculate demographic score (0-100)
  demographic_score := 0;
  
  -- Budget qualification
  IF lead_data.estimated_budget > 100000 THEN
    demographic_score := demographic_score + 40;
  ELSIF lead_data.estimated_budget > 50000 THEN
    demographic_score := demographic_score + 25;
  ELSIF lead_data.estimated_budget > 25000 THEN
    demographic_score := demographic_score + 15;
  END IF;
  
  -- Decision maker status
  IF lead_data.decision_maker THEN
    demographic_score := demographic_score + 25;
  END IF;
  
  -- Company size (if available)
  IF lead_data.company_name IS NOT NULL AND length(lead_data.company_name) > 0 THEN
    demographic_score := demographic_score + 15;
  END IF;
  
  -- Location fit
  IF lead_data.location IS NOT NULL THEN
    demographic_score := demographic_score + 10;
  END IF;
  
  -- Financing secured
  IF lead_data.financing_secured THEN
    demographic_score := demographic_score + 10;
  END IF;
  
  demographic_score := LEAST(demographic_score, 100);
  
  -- Calculate behavioral score if data exists
  IF behavioral_data IS NOT NULL THEN
    behavioral_score := 0;
    
    -- Email engagement
    IF behavioral_data.email_opens > 5 THEN
      behavioral_score := behavioral_score + 20;
    ELSIF behavioral_data.email_opens > 2 THEN
      behavioral_score := behavioral_score + 10;
    END IF;
    
    -- Website engagement
    IF behavioral_data.website_visits > 10 THEN
      behavioral_score := behavioral_score + 25;
    ELSIF behavioral_data.website_visits > 5 THEN
      behavioral_score := behavioral_score + 15;
    ELSIF behavioral_data.website_visits > 0 THEN
      behavioral_score := behavioral_score + 5;
    END IF;
    
    -- Content downloads
    behavioral_score := behavioral_score + LEAST(behavioral_data.document_downloads * 10, 30);
    
    -- Form submissions
    behavioral_score := behavioral_score + LEAST(behavioral_data.form_submissions * 15, 25);
    
    behavioral_score := LEAST(behavioral_score, 100);
  END IF;
  
  -- Calculate engagement score
  engagement_score := COALESCE(behavioral_data.engagement_score, 0);
  
  -- Calculate fit score based on industry, size, location
  fit_score := demographic_score; -- Use demographic as base fit for now
  
  -- Calculate intent score based on recent activities
  IF behavioral_data IS NOT NULL AND behavioral_data.last_activity_at > (now() - INTERVAL '7 days') THEN
    intent_score := 80;
  ELSIF behavioral_data IS NOT NULL AND behavioral_data.last_activity_at > (now() - INTERVAL '30 days') THEN
    intent_score := 60;
  ELSIF behavioral_data IS NOT NULL AND behavioral_data.last_activity_at > (now() - INTERVAL '90 days') THEN
    intent_score := 30;
  ELSE
    intent_score := 10;
  END IF;
  
  -- Calculate timing score
  IF lead_data.project_timeline = 'immediate' THEN
    timing_score := 90;
  ELSIF lead_data.project_timeline = '1-3 months' THEN
    timing_score := 75;
  ELSIF lead_data.project_timeline = '3-6 months' THEN
    timing_score := 50;
  ELSIF lead_data.project_timeline = '6-12 months' THEN
    timing_score := 25;
  ELSE
    timing_score := 10;
  END IF;
  
  -- Calculate weighted overall score
  overall_score := ROUND((
    demographic_score * 0.25 +
    behavioral_score * 0.20 +
    engagement_score * 0.15 +
    fit_score * 0.15 +
    intent_score * 0.15 +
    timing_score * 0.10
  ));
  
  -- Build response
  score := jsonb_build_object(
    'overall_score', overall_score,
    'demographic_score', demographic_score,
    'behavioral_score', behavioral_score,
    'engagement_score', engagement_score,
    'fit_score', fit_score,
    'intent_score', intent_score,
    'timing_score', timing_score,
    'calculated_at', now()
  );
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;