-- AI-Powered Resource Optimization Schema

-- Resource optimization configurations
CREATE TABLE IF NOT EXISTS public.resource_optimization_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  optimization_strategy TEXT NOT NULL DEFAULT 'balanced', -- 'efficiency', 'cost', 'balanced', 'deadline'
  max_crew_utilization NUMERIC DEFAULT 85.0,
  max_equipment_utilization NUMERIC DEFAULT 90.0,
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

-- Resource optimization runs/sessions
CREATE TABLE IF NOT EXISTS public.resource_optimization_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  config_id UUID REFERENCES public.resource_optimization_configs(id),
  run_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'scheduled', 'triggered'
  optimization_scope TEXT NOT NULL DEFAULT 'company', -- 'company', 'project', 'crew'
  scope_id UUID NULL, -- project_id or team_id when scope is specific
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  processing_time_seconds INTEGER NULL,
  total_resources_analyzed INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  efficiency_improvement_percentage NUMERIC DEFAULT 0,
  cost_savings_estimated NUMERIC DEFAULT 0,
  error_message TEXT NULL,
  ai_model_used TEXT DEFAULT 'gpt-4.1-2025-04-14',
  optimization_data JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Optimized resource assignments
CREATE TABLE IF NOT EXISTS public.optimized_resource_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  optimization_run_id UUID NOT NULL REFERENCES public.resource_optimization_runs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  resource_type TEXT NOT NULL, -- 'crew', 'equipment', 'material'
  resource_id UUID NOT NULL, -- references teams, equipment, etc.
  project_id UUID NOT NULL,
  task_id UUID NULL, -- if specific to a task
  assignment_type TEXT DEFAULT 'primary', -- 'primary', 'backup', 'overflow'
  original_start_datetime TIMESTAMP WITH TIME ZONE NULL,
  original_end_datetime TIMESTAMP WITH TIME ZONE NULL,
  optimized_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  optimized_end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  efficiency_score NUMERIC DEFAULT 0,
  cost_impact NUMERIC DEFAULT 0,
  priority_level INTEGER DEFAULT 1,
  allocation_percentage NUMERIC DEFAULT 100.0,
  travel_time_minutes INTEGER DEFAULT 0,
  setup_time_minutes INTEGER DEFAULT 0,
  breakdown_time_minutes INTEGER DEFAULT 0,
  weather_impact_considered BOOLEAN DEFAULT false,
  skill_match_score NUMERIC DEFAULT 0,
  availability_score NUMERIC DEFAULT 0,
  optimization_reason TEXT NULL,
  constraints_applied JSONB DEFAULT '[]',
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE NULL,
  applied_by UUID NULL,
  feedback_rating INTEGER NULL, -- 1-5 user rating
  feedback_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Resource conflicts and resolutions
CREATE TABLE IF NOT EXISTS public.resource_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  optimization_run_id UUID REFERENCES public.resource_optimization_runs(id) ON DELETE SET NULL,
  conflict_type TEXT NOT NULL, -- 'double_booking', 'overallocation', 'skill_mismatch', 'unavailable', 'capacity_exceeded'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  primary_project_id UUID NOT NULL,
  secondary_project_id UUID NULL,
  primary_task_id UUID NULL,
  secondary_task_id UUID NULL,
  conflict_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  conflict_end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  overlap_duration_minutes INTEGER DEFAULT 0,
  capacity_required NUMERIC DEFAULT 0,
  capacity_available NUMERIC DEFAULT 0,
  skill_required TEXT NULL,
  skill_available TEXT NULL,
  status TEXT NOT NULL DEFAULT 'detected', -- 'detected', 'resolved', 'ignored', 'escalated'
  resolution_strategy TEXT NULL, -- 'reschedule', 'reallocate', 'split_resource', 'overtime', 'hire_additional'
  resolution_applied BOOLEAN DEFAULT false,
  resolution_details JSONB DEFAULT '{}',
  auto_resolvable BOOLEAN DEFAULT false,
  priority_score NUMERIC DEFAULT 0,
  business_impact_score NUMERIC DEFAULT 0,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  resolved_by UUID NULL,
  ai_recommendation TEXT NULL,
  human_review_required BOOLEAN DEFAULT false,
  escalation_reason TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Resource optimization metrics
CREATE TABLE IF NOT EXISTS public.resource_optimization_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  optimization_run_id UUID NOT NULL REFERENCES public.resource_optimization_runs(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_resources INTEGER DEFAULT 0,
  total_hours_scheduled NUMERIC DEFAULT 0,
  total_hours_optimized NUMERIC DEFAULT 0,
  efficiency_before_percentage NUMERIC DEFAULT 0,
  efficiency_after_percentage NUMERIC DEFAULT 0,
  efficiency_improvement NUMERIC DEFAULT 0,
  cost_before NUMERIC DEFAULT 0,
  cost_after NUMERIC DEFAULT 0,
  cost_savings NUMERIC DEFAULT 0,
  travel_time_reduced_minutes INTEGER DEFAULT 0,
  overtime_hours_reduced NUMERIC DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  crew_utilization_average NUMERIC DEFAULT 0,
  equipment_utilization_average NUMERIC DEFAULT 0,
  projects_impacted INTEGER DEFAULT 0,
  tasks_rescheduled INTEGER DEFAULT 0,
  user_satisfaction_score NUMERIC DEFAULT 0,
  ai_confidence_average NUMERIC DEFAULT 0,
  processing_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Resource availability patterns (for AI learning)
CREATE TABLE IF NOT EXISTS public.resource_availability_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'daily', 'weekly', 'seasonal', 'project_based'
  pattern_data JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0,
  usage_frequency INTEGER DEFAULT 0,
  last_validated_at TIMESTAMP WITH TIME ZONE NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_optimization_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimized_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_optimization_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_availability_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view company resource optimization configs" ON public.resource_optimization_configs
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage company resource optimization configs" ON public.resource_optimization_configs
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view company resource optimization runs" ON public.resource_optimization_runs
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage company resource optimization runs" ON public.resource_optimization_runs
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view company optimized assignments" ON public.optimized_resource_assignments
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage company optimized assignments" ON public.optimized_resource_assignments
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view company resource conflicts" ON public.resource_conflicts
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage company resource conflicts" ON public.resource_conflicts
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view company optimization metrics" ON public.resource_optimization_metrics
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "System can insert optimization metrics" ON public.resource_optimization_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view company availability patterns" ON public.resource_availability_patterns
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "System can manage availability patterns" ON public.resource_availability_patterns
  FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_resource_optimization_configs_company ON public.resource_optimization_configs(company_id);
CREATE INDEX idx_resource_optimization_runs_company ON public.resource_optimization_runs(company_id, status);
CREATE INDEX idx_resource_optimization_runs_date_range ON public.resource_optimization_runs(date_range_start, date_range_end);
CREATE INDEX idx_optimized_assignments_run ON public.optimized_resource_assignments(optimization_run_id);
CREATE INDEX idx_optimized_assignments_resource ON public.optimized_resource_assignments(resource_type, resource_id);
CREATE INDEX idx_optimized_assignments_project ON public.optimized_resource_assignments(project_id);
CREATE INDEX idx_optimized_assignments_datetime ON public.optimized_resource_assignments(optimized_start_datetime, optimized_end_datetime);
CREATE INDEX idx_resource_conflicts_company ON public.resource_conflicts(company_id, status);
CREATE INDEX idx_resource_conflicts_resource ON public.resource_conflicts(resource_type, resource_id);
CREATE INDEX idx_resource_conflicts_datetime ON public.resource_conflicts(conflict_start_datetime, conflict_end_datetime);
CREATE INDEX idx_optimization_metrics_company ON public.resource_optimization_metrics(company_id, metric_date);
CREATE INDEX idx_availability_patterns_resource ON public.resource_availability_patterns(resource_type, resource_id, is_active);

-- Triggers for updated_at
CREATE TRIGGER update_resource_optimization_configs_updated_at 
  BEFORE UPDATE ON public.resource_optimization_configs 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resource_conflicts_updated_at 
  BEFORE UPDATE ON public.resource_conflicts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resource_availability_patterns_updated_at 
  BEFORE UPDATE ON public.resource_availability_patterns 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration for existing companies
INSERT INTO public.resource_optimization_configs (company_id, optimization_strategy)
SELECT DISTINCT company_id, 'balanced'
FROM public.user_profiles 
WHERE company_id IS NOT NULL
ON CONFLICT DO NOTHING;