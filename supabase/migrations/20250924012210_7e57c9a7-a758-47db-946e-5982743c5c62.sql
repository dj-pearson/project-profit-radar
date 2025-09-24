-- Add missing tables for comprehensive job costing system

-- Budget line items table (if not exists)
CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  cost_code_id UUID,
  category TEXT NOT NULL, -- 'labor', 'materials', 'equipment', 'subcontractors', 'overhead'
  description TEXT NOT NULL,
  budgeted_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  budgeted_unit_cost DECIMAL(10,2) NOT NULL,
  budgeted_total DECIMAL(10,2) NOT NULL,
  actual_quantity DECIMAL(10,2) DEFAULT 0,
  actual_total DECIMAL(10,2) DEFAULT 0,
  variance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Labor costs table (if not exists)  
CREATE TABLE IF NOT EXISTS public.labor_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  employee_id UUID,
  employee_name TEXT,
  cost_code_id UUID,
  hours_worked DECIMAL(8,2) NOT NULL,
  hourly_rate DECIMAL(8,2) NOT NULL,
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  overtime_rate DECIMAL(8,2) DEFAULT 0,
  total_labor_cost DECIMAL(10,2) NOT NULL,
  burden_rate DECIMAL(5,2) DEFAULT 0, -- percentage for benefits, taxes, etc
  total_cost_with_burden DECIMAL(10,2) NOT NULL,
  work_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job costing summary view (materialized for performance)
CREATE TABLE IF NOT EXISTS public.job_costing_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE,
  total_budgeted DECIMAL(12,2) DEFAULT 0,
  total_actual DECIMAL(12,2) DEFAULT 0,
  total_variance DECIMAL(12,2) DEFAULT 0,
  variance_percentage DECIMAL(5,2) DEFAULT 0,
  labor_budgeted DECIMAL(12,2) DEFAULT 0,
  labor_actual DECIMAL(12,2) DEFAULT 0,
  materials_budgeted DECIMAL(12,2) DEFAULT 0,
  materials_actual DECIMAL(12,2) DEFAULT 0,
  equipment_budgeted DECIMAL(12,2) DEFAULT 0,
  equipment_actual DECIMAL(12,2) DEFAULT 0,
  subcontractors_budgeted DECIMAL(12,2) DEFAULT 0,
  subcontractors_actual DECIMAL(12,2) DEFAULT 0,
  overhead_budgeted DECIMAL(12,2) DEFAULT 0,
  overhead_actual DECIMAL(12,2) DEFAULT 0,
  profit_margin_percentage DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_costing_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_line_items
DROP POLICY IF EXISTS "Users can view budget items for their company projects" ON public.budget_line_items;
DROP POLICY IF EXISTS "Users can manage budget items for their company projects" ON public.budget_line_items;

CREATE POLICY "Users can view budget items for their company projects" 
ON public.budget_line_items FOR SELECT 
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.user_profiles pr ON p.company_id = pr.company_id
    WHERE pr.id = auth.uid()
  )
);

CREATE POLICY "Users can manage budget items for their company projects" 
ON public.budget_line_items FOR ALL 
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.user_profiles pr ON p.company_id = pr.company_id
    WHERE pr.id = auth.uid() 
    AND pr.role IN ('admin', 'project_manager', 'root_admin')
  )
);

-- RLS Policies for labor_costs
DROP POLICY IF EXISTS "Users can view labor costs for their company projects" ON public.labor_costs;
DROP POLICY IF EXISTS "Users can manage labor costs for their company projects" ON public.labor_costs;

CREATE POLICY "Users can view labor costs for their company projects" 
ON public.labor_costs FOR SELECT 
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.user_profiles pr ON p.company_id = pr.company_id
    WHERE pr.id = auth.uid()
  )
);

CREATE POLICY "Users can manage labor costs for their company projects" 
ON public.labor_costs FOR ALL 
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.user_profiles pr ON p.company_id = pr.company_id
    WHERE pr.id = auth.uid() 
    AND pr.role IN ('admin', 'project_manager', 'field_supervisor', 'root_admin')
  )
);

-- RLS Policies for job_costing_summary
CREATE POLICY "Users can view job costing summary for their company projects" 
ON public.job_costing_summary FOR SELECT 
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.user_profiles pr ON p.company_id = pr.company_id
    WHERE pr.id = auth.uid()
  )
);

CREATE POLICY "System can manage job costing summary" 
ON public.job_costing_summary FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_line_items_project ON public.budget_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_cost_code ON public.budget_line_items(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_labor_costs_project ON public.labor_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_labor_costs_employee ON public.labor_costs(employee_id);
CREATE INDEX IF NOT EXISTS idx_labor_costs_work_date ON public.labor_costs(work_date);
CREATE INDEX IF NOT EXISTS idx_job_costing_summary_project ON public.job_costing_summary(project_id);

-- Create or replace triggers for updated_at
DROP TRIGGER IF EXISTS update_budget_line_items_updated_at ON public.budget_line_items;
DROP TRIGGER IF EXISTS update_labor_costs_updated_at ON public.labor_costs;

CREATE TRIGGER update_budget_line_items_updated_at
  BEFORE UPDATE ON public.budget_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_labor_costs_updated_at
  BEFORE UPDATE ON public.labor_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();