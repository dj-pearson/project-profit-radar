-- Expand projects table with comprehensive construction management fields
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'custom';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS site_address TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS permit_numbers TEXT[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES auth.users(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_hours INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;

-- Create project phases table
CREATE TABLE public.project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  estimated_budget DECIMAL(12,2),
  actual_cost DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'planning',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tasks table for project task management
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  estimated_hours INTEGER,
  actual_hours INTEGER DEFAULT 0,
  due_date DATE,
  completion_percentage INTEGER DEFAULT 0,
  dependencies UUID[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cost codes table for financial tracking
CREATE TABLE public.cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Create job costing table for real-time cost tracking
CREATE TABLE public.job_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  cost_code_id UUID REFERENCES public.cost_codes(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  labor_hours DECIMAL(8,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  material_cost DECIMAL(12,2) DEFAULT 0,
  equipment_cost DECIMAL(12,2) DEFAULT 0,
  other_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) GENERATED ALWAYS AS (labor_cost + material_cost + equipment_cost + other_cost) STORED,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create change orders table
CREATE TABLE public.change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  change_order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  client_approved BOOLEAN DEFAULT false,
  client_approved_date TIMESTAMPTZ,
  internal_approved BOOLEAN DEFAULT false,
  internal_approved_by UUID REFERENCES auth.users(id),
  internal_approved_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, change_order_number)
);

-- Create document categories table
CREATE TABLE public.document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.document_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.document_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  version INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES public.documents(id),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create time tracking table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0,
  total_hours DECIMAL(8,2),
  description TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create daily reports table for field reporting
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather_conditions TEXT,
  crew_count INTEGER,
  work_performed TEXT,
  materials_delivered TEXT,
  equipment_used TEXT,
  safety_incidents TEXT,
  delays_issues TEXT,
  photos TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, date)
);

-- Enable RLS on all new tables
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_phases
CREATE POLICY "Users can view company project phases" 
ON public.project_phases FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_phases.project_id 
    AND (p.company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin')
  )
);

CREATE POLICY "Project managers can manage phases" 
ON public.project_phases FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_phases.project_id 
    AND p.company_id = public.get_user_company(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin')
  )
);

-- RLS Policies for tasks
CREATE POLICY "Users can view company tasks" 
ON public.tasks FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = tasks.project_id 
    AND (p.company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin')
  )
);

CREATE POLICY "Project managers can manage tasks" 
ON public.tasks FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = tasks.project_id 
    AND p.company_id = public.get_user_company(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin')
  )
);

-- RLS Policies for cost_codes
CREATE POLICY "Users can view company cost codes" 
ON public.cost_codes FOR SELECT 
USING (company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage cost codes" 
ON public.cost_codes FOR ALL 
USING (
  company_id = public.get_user_company(auth.uid()) 
  AND public.get_user_role(auth.uid()) IN ('admin', 'root_admin')
);

-- RLS Policies for job_costs
CREATE POLICY "Users can view company job costs" 
ON public.job_costs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = job_costs.project_id 
    AND (p.company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin')
  )
);

CREATE POLICY "Project managers can manage job costs" 
ON public.job_costs FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = job_costs.project_id 
    AND p.company_id = public.get_user_company(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'accounting', 'root_admin')
  )
);

-- RLS Policies for change_orders
CREATE POLICY "Users can view company change orders" 
ON public.change_orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = change_orders.project_id 
    AND (p.company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin')
  )
);

CREATE POLICY "Project managers can manage change orders" 
ON public.change_orders FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = change_orders.project_id 
    AND p.company_id = public.get_user_company(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin')
  )
);

-- RLS Policies for document_categories
CREATE POLICY "Users can view company document categories" 
ON public.document_categories FOR SELECT 
USING (company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage document categories" 
ON public.document_categories FOR ALL 
USING (
  company_id = public.get_user_company(auth.uid()) 
  AND public.get_user_role(auth.uid()) IN ('admin', 'office_staff', 'root_admin')
);

-- RLS Policies for documents
CREATE POLICY "Users can view company documents" 
ON public.documents FOR SELECT 
USING (
  (company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin')
  AND (
    project_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = documents.project_id 
      AND p.company_id = public.get_user_company(auth.uid())
    )
  )
);

CREATE POLICY "Office staff can manage documents" 
ON public.documents FOR ALL 
USING (
  company_id = public.get_user_company(auth.uid()) 
  AND public.get_user_role(auth.uid()) IN ('admin', 'office_staff', 'project_manager', 'root_admin')
);

-- RLS Policies for time_entries
CREATE POLICY "Users can view their own time entries" 
ON public.time_entries FOR SELECT 
USING (
  user_id = auth.uid() 
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = time_entries.project_id 
      AND p.company_id = public.get_user_company(auth.uid()) 
      AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin')
    )
  )
);

CREATE POLICY "Users can manage their own time entries" 
ON public.time_entries FOR INSERT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries" 
ON public.time_entries FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Managers can manage all company time entries" 
ON public.time_entries FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = time_entries.project_id 
    AND p.company_id = public.get_user_company(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin')
  )
);

-- RLS Policies for daily_reports
CREATE POLICY "Users can view company daily reports" 
ON public.daily_reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = daily_reports.project_id 
    AND (p.company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin')
  )
);

CREATE POLICY "Field supervisors can manage daily reports" 
ON public.daily_reports FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = daily_reports.project_id 
    AND p.company_id = public.get_user_company(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'field_supervisor', 'root_admin')
  )
);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_codes_updated_at
  BEFORE UPDATE ON public.cost_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_costs_updated_at
  BEFORE UPDATE ON public.job_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_change_orders_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON public.document_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();