-- Create infrastructure monitoring tables
CREATE TABLE public.database_optimization_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  table_name TEXT,
  index_name TEXT,
  query_hash TEXT,
  performance_score NUMERIC,
  execution_time_ms INTEGER,
  usage_count INTEGER,
  size_bytes BIGINT,
  optimization_suggestions JSONB DEFAULT '[]'::JSONB,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.database_optimization_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage optimization metrics" 
ON public.database_optimization_metrics 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role])));

-- Create compliance tracking tables
CREATE TABLE public.compliance_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('safety', 'environmental', 'licensing', 'financial', 'operational')),
  industry TEXT,
  regulatory_body TEXT,
  compliance_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (compliance_status IN ('compliant', 'non_compliant', 'pending_review', 'expired')),
  last_verified DATE,
  next_review_date DATE,
  documentation_required JSONB DEFAULT '[]'::JSONB,
  penalties_for_non_compliance TEXT,
  action_items JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company compliance requirements" 
ON public.compliance_requirements 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Staff can manage compliance requirements" 
ON public.compliance_requirements 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'safety_officer'::user_role, 'root_admin'::user_role])));

-- Create compliance audits table
CREATE TABLE public.compliance_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  audit_type TEXT NOT NULL,
  auditor_name TEXT,
  audit_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
  findings JSONB DEFAULT '[]'::JSONB,
  recommendations JSONB DEFAULT '[]'::JSONB,
  next_audit_date DATE,
  documents JSONB DEFAULT '[]'::JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_audits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company compliance audits" 
ON public.compliance_audits 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Staff can manage compliance audits" 
ON public.compliance_audits 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'safety_officer'::user_role, 'root_admin'::user_role])));

-- Create resource optimization tables
CREATE TABLE public.resource_optimization_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  optimization_strategy TEXT NOT NULL DEFAULT 'balanced',
  max_crew_utilization INTEGER DEFAULT 85,
  max_equipment_utilization INTEGER DEFAULT 90,
  prefer_dedicated_crews BOOLEAN DEFAULT true,
  allow_overtime BOOLEAN DEFAULT true,
  max_overtime_hours INTEGER DEFAULT 10,
  travel_time_factor NUMERIC DEFAULT 1.5,
  skill_matching_weight NUMERIC DEFAULT 0.7,
  availability_weight NUMERIC DEFAULT 0.8,
  cost_weight NUMERIC DEFAULT 0.6,
  priority_weight NUMERIC DEFAULT 0.9,
  weather_consideration BOOLEAN DEFAULT true,
  auto_reschedule BOOLEAN DEFAULT false,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_optimization_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company optimization configs" 
ON public.resource_optimization_configs 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Managers can manage optimization configs" 
ON public.resource_optimization_configs 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

-- Create resource optimization runs table
CREATE TABLE public.resource_optimization_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_resources_analyzed INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  efficiency_improvement_percentage NUMERIC DEFAULT 0,
  cost_savings_estimated NUMERIC DEFAULT 0,
  recommendations JSONB DEFAULT '[]'::JSONB,
  optimization_data JSONB DEFAULT '{}'::JSONB,
  ai_model_used TEXT,
  run_type TEXT DEFAULT 'manual',
  optimization_scope TEXT DEFAULT 'company',
  scope_id UUID,
  date_range_start DATE,
  date_range_end DATE,
  processing_time_seconds INTEGER,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_optimization_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company optimization runs" 
ON public.resource_optimization_runs 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Managers can manage optimization runs" 
ON public.resource_optimization_runs 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

-- Create resource conflicts table
CREATE TABLE public.resource_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  conflict_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resource_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'resolved', 'ignored')),
  conflict_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  conflict_end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  overlap_duration_minutes INTEGER,
  auto_resolvable BOOLEAN DEFAULT false,
  resolution_suggestion TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_conflicts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company resource conflicts" 
ON public.resource_conflicts 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Managers can manage resource conflicts" 
ON public.resource_conflicts 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

-- Add indexes for performance
CREATE INDEX idx_database_optimization_metrics_company_id ON public.database_optimization_metrics(company_id);
CREATE INDEX idx_compliance_requirements_company_id ON public.compliance_requirements(company_id);
CREATE INDEX idx_compliance_requirements_status ON public.compliance_requirements(compliance_status);
CREATE INDEX idx_compliance_audits_company_id ON public.compliance_audits(company_id);
CREATE INDEX idx_resource_optimization_configs_company_id ON public.resource_optimization_configs(company_id);
CREATE INDEX idx_resource_optimization_runs_company_id ON public.resource_optimization_runs(company_id);
CREATE INDEX idx_resource_conflicts_company_id ON public.resource_conflicts(company_id);
CREATE INDEX idx_resource_conflicts_status ON public.resource_conflicts(status);

-- Add updated_at triggers
CREATE TRIGGER update_database_optimization_metrics_updated_at
  BEFORE UPDATE ON public.database_optimization_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_requirements_updated_at
  BEFORE UPDATE ON public.compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_audits_updated_at
  BEFORE UPDATE ON public.compliance_audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resource_optimization_configs_updated_at
  BEFORE UPDATE ON public.resource_optimization_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resource_conflicts_updated_at
  BEFORE UPDATE ON public.resource_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();