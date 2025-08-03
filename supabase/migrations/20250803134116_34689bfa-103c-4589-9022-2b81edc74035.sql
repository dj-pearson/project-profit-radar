-- Create performance benchmarks table
CREATE TABLE IF NOT EXISTS public.performance_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  benchmark_period TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Company metrics
  company_profit_margin NUMERIC(5,2),
  company_project_completion_rate NUMERIC(5,2),
  company_budget_variance NUMERIC(5,2),
  company_safety_incidents INTEGER DEFAULT 0,
  company_client_satisfaction NUMERIC(3,2),
  company_employee_productivity NUMERIC(5,2),
  
  -- Industry benchmarks
  industry_avg_profit_margin NUMERIC(5,2),
  industry_avg_completion_rate NUMERIC(5,2),
  industry_avg_budget_variance NUMERIC(5,2),
  industry_avg_safety_incidents NUMERIC(5,2),
  industry_avg_client_satisfaction NUMERIC(3,2),
  industry_avg_productivity NUMERIC(5,2),
  
  -- Top performer benchmarks
  top_performer_profit_margin NUMERIC(5,2),
  top_performer_completion_rate NUMERIC(5,2),
  top_performer_budget_variance NUMERIC(5,2),
  top_performer_safety_incidents NUMERIC(5,2),
  top_performer_client_satisfaction NUMERIC(3,2),
  top_performer_productivity NUMERIC(5,2),
  
  -- Competitive analysis
  market_position_percentile INTEGER, -- 1-100
  areas_for_improvement JSONB DEFAULT '[]'::jsonb,
  competitive_advantages JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  industry_sector TEXT DEFAULT 'construction',
  company_size_category TEXT, -- 'small', 'medium', 'large'
  geographic_region TEXT,
  data_source TEXT DEFAULT 'ai_generated',
  confidence_score NUMERIC(3,2) DEFAULT 0.85,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view company performance benchmarks"
  ON public.performance_benchmarks FOR SELECT
  USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Staff can manage company performance benchmarks"
  ON public.performance_benchmarks FOR ALL
  USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
  );

-- Add indexes
CREATE INDEX idx_performance_benchmarks_company_period ON public.performance_benchmarks(company_id, benchmark_period, period_start);
CREATE INDEX idx_performance_benchmarks_industry ON public.performance_benchmarks(industry_sector, company_size_category);

-- Add trigger for updated_at
CREATE TRIGGER update_performance_benchmarks_updated_at
  BEFORE UPDATE ON public.performance_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();