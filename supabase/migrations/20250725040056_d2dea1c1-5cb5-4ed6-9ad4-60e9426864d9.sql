-- Add missing pipeline management tables and enhance existing ones

-- First, let's enhance the existing pipeline_stages table
ALTER TABLE pipeline_stages 
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS probability_weight INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_final_stage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_won_stage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_lost_stage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_tasks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS required_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS expected_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2);

-- Pipeline Templates for different deal types
CREATE TABLE IF NOT EXISTS pipeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  deal_type TEXT NOT NULL DEFAULT 'standard',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced Deals table (separate from opportunities)
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  contact_id UUID REFERENCES contacts(id),
  pipeline_template_id UUID REFERENCES pipeline_templates(id),
  current_stage_id UUID REFERENCES pipeline_stages(id),
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  deal_type TEXT DEFAULT 'standard',
  
  -- Financial
  estimated_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  actual_value DECIMAL(15,2),
  
  -- Timeline
  expected_close_date DATE,
  actual_close_date DATE,
  
  -- Assignment
  primary_contact_id UUID REFERENCES contacts(id),
  account_manager_id UUID REFERENCES auth.users(id),
  sales_rep_id UUID REFERENCES auth.users(id),
  
  -- Competition & Strategy
  competitors JSONB DEFAULT '[]'::jsonb,
  competitive_advantage TEXT,
  key_success_factors JSONB DEFAULT '[]'::jsonb,
  
  -- Risk Assessment
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB DEFAULT '[]'::jsonb,
  mitigation_strategies TEXT,
  
  -- Status & Tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'on_hold')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source TEXT,
  
  -- Close Information
  won_reason TEXT,
  lost_reason TEXT,
  lost_to_competitor TEXT,
  
  -- Custom Fields
  custom_fields JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Deal Stage History for tracking progression
CREATE TABLE IF NOT EXISTS deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  moved_by UUID REFERENCES auth.users(id),
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  days_in_previous_stage INTEGER,
  auto_moved BOOLEAN DEFAULT false,
  
  -- Value changes during stage transition
  value_before DECIMAL(15,2),
  value_after DECIMAL(15,2),
  probability_before INTEGER,
  probability_after INTEGER
);

-- Deal Activities for tracking interactions
CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  next_action TEXT,
  
  -- Scheduling
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Related records
  contact_id UUID REFERENCES contacts(id),
  document_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  is_completed BOOLEAN DEFAULT false,
  is_automated BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pipeline Metrics for performance tracking
CREATE TABLE IF NOT EXISTS pipeline_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES pipeline_templates(id),
  
  -- Time Period
  metric_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily',
  
  -- Deal Metrics
  deals_created INTEGER DEFAULT 0,
  deals_won INTEGER DEFAULT 0,
  deals_lost INTEGER DEFAULT 0,
  deals_active INTEGER DEFAULT 0,
  
  -- Value Metrics
  total_pipeline_value DECIMAL(15,2) DEFAULT 0,
  weighted_pipeline_value DECIMAL(15,2) DEFAULT 0,
  won_value DECIMAL(15,2) DEFAULT 0,
  lost_value DECIMAL(15,2) DEFAULT 0,
  
  -- Performance Metrics
  average_deal_size DECIMAL(15,2) DEFAULT 0,
  average_cycle_time DECIMAL(8,2) DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sales Quotas and Targets
CREATE TABLE IF NOT EXISTS sales_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Quota Period
  quota_period TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Targets
  revenue_target DECIMAL(15,2) NOT NULL DEFAULT 0,
  deals_target INTEGER DEFAULT 0,
  calls_target INTEGER DEFAULT 0,
  meetings_target INTEGER DEFAULT 0,
  
  -- Territory/Focus
  territory TEXT,
  deal_types TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Lead Routing Rules
CREATE TABLE IF NOT EXISTS lead_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Conditions (JSON rules engine)
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Actions
  assign_to_user_id UUID REFERENCES auth.users(id),
  assign_to_team TEXT,
  set_priority TEXT,
  add_tags TEXT[],
  auto_create_tasks JSONB DEFAULT '[]'::jsonb,
  
  -- Round Robin settings
  use_round_robin BOOLEAN DEFAULT false,
  round_robin_users UUID[] DEFAULT '{}',
  last_assigned_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_company_stage ON deals(company_id, current_stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_sales_rep ON deals(sales_rep_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON deals(expected_close_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_date ON deal_activities(deal_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_company_date ON pipeline_metrics(company_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_deal ON deal_stage_history(deal_id, moved_at);

-- Enable RLS on new tables
ALTER TABLE pipeline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_routing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage company pipeline templates" ON pipeline_templates
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company deals" ON deals
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can view deal stage history" ON deal_stage_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM deals WHERE deals.id = deal_stage_history.deal_id 
    AND deals.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Users can manage deal activities" ON deal_activities
  FOR ALL USING (EXISTS (
    SELECT 1 FROM deals WHERE deals.id = deal_activities.deal_id 
    AND deals.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Users can view company pipeline metrics" ON pipeline_metrics
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage sales quotas" ON sales_quotas
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view their quotas" ON sales_quotas
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) AND 
    (user_id = auth.uid() OR get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]))
  );

CREATE POLICY "Admins can manage routing rules" ON lead_routing_rules
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

-- Add update triggers
CREATE TRIGGER update_pipeline_templates_updated_at
  BEFORE UPDATE ON pipeline_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_activities_updated_at
  BEFORE UPDATE ON deal_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_quotas_updated_at
  BEFORE UPDATE ON sales_quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_routing_rules_updated_at
  BEFORE UPDATE ON lead_routing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();