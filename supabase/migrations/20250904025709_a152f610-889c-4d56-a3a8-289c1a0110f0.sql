-- Construction Timeline Intelligence Tables
CREATE TABLE IF NOT EXISTS public.schedule_conflicts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  conflict_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  affected_tasks jsonb DEFAULT '[]'::jsonb,
  suggested_resolution text,
  resolution_status text DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timeline_optimizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  optimization_type text NOT NULL,
  estimated_time_saved integer DEFAULT 0,
  optimizations_applied jsonb DEFAULT '[]'::jsonb,
  applied_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  task_id uuid,
  inspection_type text NOT NULL,
  scheduled_date date NOT NULL,
  inspector_name text,
  inspector_contact text,
  status text DEFAULT 'scheduled',
  required_documentation jsonb DEFAULT '[]'::jsonb,
  completion_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Material Orchestration Tables  
CREATE TABLE IF NOT EXISTS public.material_shortages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid,
  material_name text NOT NULL,
  current_quantity numeric DEFAULT 0,
  required_quantity numeric NOT NULL,
  shortage_quantity numeric NOT NULL,
  shortage_date date NOT NULL,
  severity text DEFAULT 'medium',
  supplier_contact text,
  estimated_resolution_date date,
  resolution_plan text,
  status text DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.material_delivery_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid,
  material_name text NOT NULL,
  supplier_name text NOT NULL,
  delivery_date date NOT NULL,
  quantity numeric NOT NULL,
  delivery_address text,
  special_instructions text,
  tracking_number text,
  delivery_status text DEFAULT 'scheduled',
  received_quantity numeric DEFAULT 0,
  received_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_optimizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid,
  material_name text NOT NULL,
  current_stock_level numeric DEFAULT 0,
  optimal_stock_level numeric NOT NULL,
  reorder_point numeric NOT NULL,
  cost_savings_potential numeric DEFAULT 0,
  optimization_recommendations jsonb DEFAULT '[]'::jsonb,
  applied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.material_usage_predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid,
  material_name text NOT NULL,
  predicted_usage numeric NOT NULL,
  prediction_date date NOT NULL,
  confidence_level numeric DEFAULT 0.5,
  based_on_data jsonb DEFAULT '{}'::jsonb,
  actual_usage numeric,
  accuracy_score numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Trade Handoff Coordination Tables
CREATE TABLE IF NOT EXISTS public.trade_handoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  from_trade text NOT NULL,
  to_trade text NOT NULL,
  handoff_date date NOT NULL,
  completion_percentage numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  status text DEFAULT 'pending',
  notes text,
  quality_checklist jsonb DEFAULT '[]'::jsonb,
  sign_off_from_trade uuid,
  sign_off_to_trade uuid,
  signed_off_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trade_conflicts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  handoff_id uuid,
  conflict_type text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'medium',
  affected_trades jsonb DEFAULT '[]'::jsonb,
  resolution_plan text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  status text DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trade_performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  trade_name text NOT NULL,
  on_time_completion_rate numeric DEFAULT 0,
  quality_average_score numeric DEFAULT 0,
  handoff_efficiency_score numeric DEFAULT 0,
  total_handoffs_completed integer DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.schedule_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_shortages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_delivery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_usage_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Construction Timeline Intelligence
CREATE POLICY "Users can view company schedule conflicts"
  ON public.schedule_conflicts FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage schedule conflicts"
  ON public.schedule_conflicts FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company timeline optimizations"
  ON public.timeline_optimizations FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage timeline optimizations"
  ON public.timeline_optimizations FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company inspection schedules"
  ON public.inspection_schedules FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage inspection schedules"
  ON public.inspection_schedules FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'quality_inspector'::user_role, 'root_admin'::user_role])));

-- RLS Policies for Material Orchestration
CREATE POLICY "Users can view company material shortages"
  ON public.material_shortages FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage material shortages"
  ON public.material_shortages FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company delivery plans"
  ON public.material_delivery_plans FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage delivery plans"
  ON public.material_delivery_plans FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company inventory optimizations"
  ON public.inventory_optimizations FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage inventory optimizations"
  ON public.inventory_optimizations FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company usage predictions"
  ON public.material_usage_predictions FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage usage predictions"
  ON public.material_usage_predictions FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])));

-- RLS Policies for Trade Handoff Coordination
CREATE POLICY "Users can view company trade handoffs"
  ON public.trade_handoffs FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage trade handoffs"
  ON public.trade_handoffs FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'foreman'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company trade conflicts"
  ON public.trade_conflicts FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage trade conflicts"
  ON public.trade_conflicts FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'foreman'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company performance metrics"
  ON public.trade_performance_metrics FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage performance metrics"
  ON public.trade_performance_metrics FOR ALL
  USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

-- Add triggers for updated_at columns
CREATE TRIGGER update_schedule_conflicts_updated_at
  BEFORE UPDATE ON public.schedule_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timeline_optimizations_updated_at
  BEFORE UPDATE ON public.timeline_optimizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_schedules_updated_at
  BEFORE UPDATE ON public.inspection_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_shortages_updated_at
  BEFORE UPDATE ON public.material_shortages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_delivery_plans_updated_at
  BEFORE UPDATE ON public.material_delivery_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_optimizations_updated_at
  BEFORE UPDATE ON public.inventory_optimizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_usage_predictions_updated_at
  BEFORE UPDATE ON public.material_usage_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_handoffs_updated_at
  BEFORE UPDATE ON public.trade_handoffs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_conflicts_updated_at
  BEFORE UPDATE ON public.trade_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_performance_metrics_updated_at
  BEFORE UPDATE ON public.trade_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();