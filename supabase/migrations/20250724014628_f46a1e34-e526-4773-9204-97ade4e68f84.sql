-- Enhanced Sales Pipeline Management System

-- Pipeline Templates for different deal types
CREATE TABLE pipeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  deal_type TEXT NOT NULL DEFAULT 'standard', -- standard, large_project, residential, commercial
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pipeline Stages Configuration
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES pipeline_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stage_order INTEGER NOT NULL,
  color_code TEXT DEFAULT '#3B82F6',
  probability_weight INTEGER DEFAULT 50, -- 0-100 for weighted pipeline value
  is_final_stage BOOLEAN DEFAULT false,
  is_won_stage BOOLEAN DEFAULT false,
  is_lost_stage BOOLEAN DEFAULT false,
  auto_tasks JSONB DEFAULT '[]'::jsonb, -- Automated tasks triggered on entry
  required_fields JSONB DEFAULT '[]'::jsonb, -- Required fields to move to next stage
  expected_duration_days INTEGER, -- Average time spent in this stage
  conversion_rate DECIMAL(5,2), -- Historical conversion rate to next stage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_id, stage_order)
);

-- Enhanced Deals/Opportunities table
CREATE TABLE deals (
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
  weighted_value DECIMAL(15,2) GENERATED ALWAYS AS (
    estimated_value * (SELECT probability_weight FROM pipeline_stages WHERE id = current_stage_id) / 100
  ) STORED,
  
  -- Timeline
  expected_close_date DATE,
  actual_close_date DATE,
  days_in_pipeline INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN actual_close_date IS NOT NULL THEN DATE_PART('day', actual_close_date - created_at::date)
      ELSE DATE_PART('day', CURRENT_DATE - created_at::date)
    END
  ) STORED,
  
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
CREATE TABLE deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  moved_by UUID REFERENCES auth.users(id),
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  days_in_previous_stage INTEGER,
  auto_moved BOOLEAN DEFAULT false, -- Whether moved by automation
  
  -- Value changes during stage transition
  value_before DECIMAL(15,2),
  value_after DECIMAL(15,2),
  probability_before INTEGER,
  probability_after INTEGER
);

-- Deal Activities for tracking interactions
CREATE TABLE deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- call, email, meeting, note, task, proposal_sent, contract_signed
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
  document_id UUID, -- Could reference documents table
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  is_completed BOOLEAN DEFAULT false,
  is_automated BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pipeline Analytics Views for performance tracking
CREATE TABLE pipeline_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES pipeline_templates(id),
  
  -- Time Period
  metric_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly, quarterly
  
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
  average_cycle_time DECIMAL(8,2) DEFAULT 0, -- Days
  win_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Velocity Metrics
  deals_moved_forward INTEGER DEFAULT 0,
  deals_moved_backward INTEGER DEFAULT 0,
  stages_velocity JSONB DEFAULT '{}'::jsonb, -- Stage-specific metrics
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sales Quotas and Targets
CREATE TABLE sales_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Quota Period
  quota_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, yearly
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

-- Lead Routing Rules for automatic assignment
CREATE TABLE lead_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 1, -- Higher number = higher priority
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

-- Indexes for performance
CREATE INDEX idx_deals_company_stage ON deals(company_id, current_stage_id);
CREATE INDEX idx_deals_sales_rep ON deals(sales_rep_id, status);
CREATE INDEX idx_deals_close_date ON deals(expected_close_date) WHERE status = 'active';
CREATE INDEX idx_deal_activities_deal_date ON deal_activities(deal_id, created_at);
CREATE INDEX idx_pipeline_metrics_company_date ON pipeline_metrics(company_id, metric_date);
CREATE INDEX idx_deal_stage_history_deal ON deal_stage_history(deal_id, moved_at);

-- Enable RLS
ALTER TABLE pipeline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_routing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage company pipeline templates" ON pipeline_templates
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company pipeline stages" ON pipeline_stages
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

-- Triggers for automatic updated_at
CREATE TRIGGER update_pipeline_templates_updated_at
  BEFORE UPDATE ON pipeline_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
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

-- Function to calculate deal velocity
CREATE OR REPLACE FUNCTION calculate_deal_velocity(p_company_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  stage_name TEXT,
  average_days DECIMAL,
  deals_count INTEGER,
  conversion_rate DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.name,
    AVG(dsh.days_in_previous_stage)::DECIMAL,
    COUNT(*)::INTEGER,
    (COUNT(*) * 100.0 / NULLIF(LAG(COUNT(*)) OVER (ORDER BY ps.stage_order), 0))::DECIMAL
  FROM deal_stage_history dsh
  JOIN deals d ON d.id = dsh.deal_id
  JOIN pipeline_stages ps ON ps.id = dsh.to_stage_id
  WHERE d.company_id = p_company_id
    AND dsh.moved_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY ps.name, ps.stage_order
  ORDER BY ps.stage_order;
END;
$$;

-- Function to auto-assign leads based on routing rules
CREATE OR REPLACE FUNCTION auto_assign_lead(p_lead_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  lead_record RECORD;
  rule_record RECORD;
  assigned_user_id UUID;
  next_user_id UUID;
  user_index INTEGER;
BEGIN
  -- Get lead details
  SELECT * INTO lead_record FROM leads WHERE id = p_lead_id;
  
  -- Find matching routing rule (highest priority first)
  FOR rule_record IN 
    SELECT * FROM lead_routing_rules 
    WHERE company_id = lead_record.company_id 
      AND is_active = true 
    ORDER BY priority DESC
  LOOP
    -- Simple condition matching (can be expanded)
    IF (rule_record.conditions->>'lead_source' IS NULL OR 
        rule_record.conditions->>'lead_source' = lead_record.lead_source) AND
       (rule_record.conditions->>'estimated_budget_min' IS NULL OR 
        COALESCE(lead_record.estimated_budget, 0) >= (rule_record.conditions->>'estimated_budget_min')::DECIMAL) THEN
      
      IF rule_record.use_round_robin THEN
        -- Round robin assignment
        SELECT COALESCE(
          (SELECT u FROM unnest(rule_record.round_robin_users) WITH ORDINALITY t(u, ord) 
           WHERE u > rule_record.last_assigned_user_id ORDER BY ord LIMIT 1),
          rule_record.round_robin_users[1]
        ) INTO next_user_id;
        
        -- Update last assigned user
        UPDATE lead_routing_rules 
        SET last_assigned_user_id = next_user_id 
        WHERE id = rule_record.id;
        
        assigned_user_id := next_user_id;
      ELSE
        assigned_user_id := rule_record.assign_to_user_id;
      END IF;
      
      -- Update lead
      UPDATE leads SET 
        assigned_to = assigned_user_id::text,
        priority = COALESCE(rule_record.set_priority, priority),
        tags = COALESCE(tags || rule_record.add_tags, tags)
      WHERE id = p_lead_id;
      
      RETURN assigned_user_id;
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$$;