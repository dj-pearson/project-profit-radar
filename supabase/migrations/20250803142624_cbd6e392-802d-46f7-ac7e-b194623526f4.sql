-- Create scaling guidance tables for business growth recommendations

-- Create table for scaling assessment questions and metrics
CREATE TABLE public.scaling_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('team_readiness', 'operational_capacity', 'financial_stability', 'market_expansion', 'technology_adoption')),
  current_score INTEGER NOT NULL CHECK (current_score >= 0 AND current_score <= 100),
  target_score INTEGER NOT NULL CHECK (target_score >= 0 AND target_score <= 100),
  assessment_data JSONB NOT NULL DEFAULT '{}',
  recommendations JSONB NOT NULL DEFAULT '[]',
  priority_level TEXT NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scaling milestones and benchmarks
CREATE TABLE public.scaling_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  milestone_category TEXT NOT NULL CHECK (milestone_category IN ('revenue', 'team_size', 'project_count', 'geographical_reach', 'service_offerings', 'operational_efficiency')),
  milestone_name TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit_type TEXT NOT NULL DEFAULT 'count' CHECK (unit_type IN ('count', 'percentage', 'currency', 'ratio')),
  target_date DATE,
  achievement_date DATE,
  is_achieved BOOLEAN NOT NULL DEFAULT false,
  difficulty_level TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
  prerequisites JSONB DEFAULT '[]',
  success_metrics JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scaling best practices and guidance
CREATE TABLE public.scaling_guidance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guidance_category TEXT NOT NULL CHECK (guidance_category IN ('team_expansion', 'process_optimization', 'technology_adoption', 'financial_planning', 'market_expansion', 'quality_control', 'compliance', 'customer_relations')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detailed_guidance TEXT NOT NULL,
  applicable_company_size TEXT NOT NULL CHECK (applicable_company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  industry_focus TEXT[] DEFAULT ARRAY['general'],
  implementation_difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (implementation_difficulty IN ('easy', 'medium', 'hard', 'expert')),
  estimated_timeframe TEXT,
  investment_required TEXT,
  expected_roi TEXT,
  prerequisites JSONB DEFAULT '[]',
  step_by_step_guide JSONB DEFAULT '[]',
  common_pitfalls JSONB DEFAULT '[]',
  success_indicators JSONB DEFAULT '[]',
  related_guidance_ids UUID[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for company scaling plans
CREATE TABLE public.scaling_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  description TEXT,
  current_stage TEXT NOT NULL CHECK (current_stage IN ('startup', 'early_growth', 'rapid_expansion', 'maturity', 'optimization')),
  target_stage TEXT NOT NULL CHECK (target_stage IN ('startup', 'early_growth', 'rapid_expansion', 'maturity', 'optimization')),
  timeline_months INTEGER NOT NULL CHECK (timeline_months > 0),
  total_investment_budget NUMERIC DEFAULT 0,
  expected_revenue_increase NUMERIC DEFAULT 0,
  key_objectives JSONB NOT NULL DEFAULT '[]',
  action_items JSONB NOT NULL DEFAULT '[]',
  risk_factors JSONB DEFAULT '[]',
  success_metrics JSONB DEFAULT '[]',
  plan_status TEXT NOT NULL DEFAULT 'draft' CHECK (plan_status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking scaling progress
CREATE TABLE public.scaling_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  scaling_plan_id UUID,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('revenue', 'team_size', 'project_count', 'customer_count', 'market_share', 'operational_efficiency', 'profit_margin')),
  metric_name TEXT NOT NULL,
  baseline_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  target_value NUMERIC NOT NULL,
  measurement_unit TEXT NOT NULL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_percentage NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN target_value = baseline_value THEN 100
      ELSE LEAST(100, GREATEST(0, ((current_value - baseline_value) / (target_value - baseline_value)) * 100))
    END
  ) STORED,
  notes TEXT,
  data_source TEXT DEFAULT 'manual',
  verified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  FOREIGN KEY (scaling_plan_id) REFERENCES public.scaling_plans(id) ON DELETE SET NULL
);

-- Enable RLS on all tables
ALTER TABLE public.scaling_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scaling_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scaling_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scaling_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scaling_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company-based access
CREATE POLICY "Users can manage their company's scaling assessments" 
ON public.scaling_assessments 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage their company's scaling milestones" 
ON public.scaling_milestones 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Everyone can view scaling guidance" 
ON public.scaling_guidance 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage scaling guidance" 
ON public.scaling_guidance 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('root_admin', 'admin')
  )
);

CREATE POLICY "Users can manage their company's scaling plans" 
ON public.scaling_plans 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage their company's scaling progress" 
ON public.scaling_progress 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_scaling_assessments_company_type ON public.scaling_assessments(company_id, assessment_type);
CREATE INDEX idx_scaling_assessments_status ON public.scaling_assessments(status, priority_level);
CREATE INDEX idx_scaling_milestones_company_category ON public.scaling_milestones(company_id, milestone_category);
CREATE INDEX idx_scaling_milestones_achievement ON public.scaling_milestones(is_achieved, target_date);
CREATE INDEX idx_scaling_guidance_category_size ON public.scaling_guidance(guidance_category, applicable_company_size);
CREATE INDEX idx_scaling_guidance_priority ON public.scaling_guidance(priority_score DESC, is_active);
CREATE INDEX idx_scaling_plans_company_status ON public.scaling_plans(company_id, plan_status);
CREATE INDEX idx_scaling_progress_company_plan ON public.scaling_progress(company_id, scaling_plan_id);
CREATE INDEX idx_scaling_progress_metric_date ON public.scaling_progress(metric_type, measurement_date);

-- Add triggers for updated_at columns
CREATE TRIGGER update_scaling_assessments_updated_at
  BEFORE UPDATE ON public.scaling_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scaling_milestones_updated_at
  BEFORE UPDATE ON public.scaling_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scaling_guidance_updated_at
  BEFORE UPDATE ON public.scaling_guidance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scaling_plans_updated_at
  BEFORE UPDATE ON public.scaling_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scaling_progress_updated_at
  BEFORE UPDATE ON public.scaling_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default scaling guidance
INSERT INTO public.scaling_guidance (guidance_category, title, description, detailed_guidance, applicable_company_size, industry_focus, implementation_difficulty, estimated_timeframe, investment_required, expected_roi, step_by_step_guide, common_pitfalls, success_indicators) VALUES
('team_expansion', 'Strategic Hiring for Growth', 'Guidelines for expanding your team effectively during growth phases', 'When scaling your construction business, strategic hiring is crucial. Focus on hiring experienced project managers and skilled tradespeople who can maintain quality while increasing capacity. Consider cultural fit alongside technical skills.', 'small', ARRAY['general'], 'medium', '3-6 months', '$50,000-$150,000', '25-40% capacity increase', 
'[
  {"step": 1, "title": "Assess Current Capacity", "description": "Evaluate current workload and identify bottlenecks"},
  {"step": 2, "title": "Define Role Requirements", "description": "Create detailed job descriptions and skill requirements"},
  {"step": 3, "title": "Develop Compensation Packages", "description": "Research market rates and create competitive offers"},
  {"step": 4, "title": "Implement Screening Process", "description": "Use skills assessments and cultural fit interviews"},
  {"step": 5, "title": "Create Onboarding Program", "description": "Develop comprehensive training for new hires"}
]'::jsonb,
'[
  {"pitfall": "Hiring too quickly", "solution": "Take time to properly vet candidates"},
  {"pitfall": "Ignoring cultural fit", "solution": "Include team members in interview process"},
  {"pitfall": "Inadequate onboarding", "solution": "Invest in proper training programs"}
]'::jsonb,
'[
  {"indicator": "Reduced project delays", "target": "25% improvement"},
  {"indicator": "Increased project capacity", "target": "30-50% more projects"},
  {"indicator": "Maintained quality scores", "target": ">95% customer satisfaction"}
]'::jsonb),

('process_optimization', 'Standardizing Operations for Scale', 'Implementing standardized processes to support business growth', 'Standardization is key to scaling efficiently. Develop standard operating procedures (SOPs) for all critical processes including project management, quality control, and safety protocols. This ensures consistency and enables delegation.', 'small', ARRAY['general'], 'medium', '2-4 months', '$10,000-$30,000', '20-35% efficiency gain',
'[
  {"step": 1, "title": "Document Current Processes", "description": "Map out all existing workflows and procedures"},
  {"step": 2, "title": "Identify Inefficiencies", "description": "Analyze processes for bottlenecks and waste"},
  {"step": 3, "title": "Design Standard Procedures", "description": "Create detailed SOPs for key processes"},
  {"step": 4, "title": "Train Team on New Processes", "description": "Implement comprehensive training program"},
  {"step": 5, "title": "Monitor and Refine", "description": "Continuously improve based on feedback"}
]'::jsonb,
'[
  {"pitfall": "Over-complicating processes", "solution": "Keep procedures simple and practical"},
  {"pitfall": "Lack of team buy-in", "solution": "Involve team in process design"},
  {"pitfall": "Inflexible procedures", "solution": "Build in adaptability for different project types"}
]'::jsonb,
'[
  {"indicator": "Process completion time", "target": "25% reduction"},
  {"indicator": "Error rates", "target": "50% reduction"},
  {"indicator": "Team productivity", "target": "30% improvement"}
]'::jsonb),

('technology_adoption', 'Technology Roadmap for Growth', 'Strategic technology adoption to support business scaling', 'Technology is an enabler of scale. Prioritize solutions that automate manual tasks, improve communication, and provide better visibility into operations. Start with core business management systems before adding specialized tools.', 'small', ARRAY['general'], 'hard', '6-12 months', '$25,000-$75,000', '15-30% operational efficiency',
'[
  {"step": 1, "title": "Technology Assessment", "description": "Evaluate current technology stack and gaps"},
  {"step": 2, "title": "Prioritize Solutions", "description": "Rank technology needs by business impact"},
  {"step": 3, "title": "Create Implementation Plan", "description": "Develop phased rollout strategy"},
  {"step": 4, "title": "Train Team", "description": "Provide comprehensive technology training"},
  {"step": 5, "title": "Measure Impact", "description": "Track ROI and adjust strategy as needed"}
]'::jsonb,
'[
  {"pitfall": "Technology for technology sake", "solution": "Focus on business value and ROI"},
  {"pitfall": "Inadequate training", "solution": "Invest heavily in user adoption"},
  {"pitfall": "Too many tools at once", "solution": "Implement gradually and ensure integration"}
]'::jsonb,
'[
  {"indicator": "Administrative time reduction", "target": "40% decrease"},
  {"indicator": "Data accuracy improvement", "target": "95% accuracy"},
  {"indicator": "User adoption rate", "target": ">90% active usage"}
]'::jsonb);