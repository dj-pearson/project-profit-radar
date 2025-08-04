-- Create core tables for construction management platform

-- Companies table (organizations using the platform)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  address JSONB,
  phone TEXT,
  email TEXT,
  website TEXT,
  license_numbers TEXT[],
  industry_type TEXT CHECK (industry_type IN ('residential', 'commercial', 'civil', 'specialty')) DEFAULT 'residential',
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-100', '100+')) DEFAULT '1-10',
  subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')) DEFAULT 'basic',
  subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled')) DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles table (additional user information beyond auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'project_manager', 'field_supervisor', 'crew_member', 'accountant', 'office_staff')) DEFAULT 'crew_member',
  permissions JSONB DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT CHECK (project_type IN ('residential', 'commercial', 'civil', 'specialty')) DEFAULT 'residential',
  status TEXT CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'canceled')) DEFAULT 'planning',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  client_name TEXT,
  client_contact JSONB,
  project_address JSONB,
  gps_coordinates POINT,
  start_date DATE,
  end_date DATE,
  estimated_completion DATE,
  budget_total DECIMAL(12,2),
  budget_labor DECIMAL(12,2),
  budget_materials DECIMAL(12,2),
  budget_equipment DECIMAL(12,2),
  budget_overhead DECIMAL(12,2),
  actual_cost DECIMAL(12,2) DEFAULT 0,
  profit_margin DECIMAL(5,2),
  contract_value DECIMAL(12,2),
  created_by UUID REFERENCES public.profiles(id),
  project_manager_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project team assignments
CREATE TABLE public.project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('project_manager', 'field_supervisor', 'crew_member', 'subcontractor')) DEFAULT 'crew_member',
  hourly_rate DECIMAL(10,2),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  removed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, user_id)
);

-- Time entries for crew tracking
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  break_duration_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(4,2),
  hourly_rate DECIMAL(10,2),
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  overtime_rate DECIMAL(10,2),
  cost_code TEXT,
  task_description TEXT,
  location_clock_in POINT,
  location_clock_out POINT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Materials management
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sku TEXT,
  unit TEXT NOT NULL, -- e.g., 'sqft', 'linear_ft', 'each', 'lb', 'gallon'
  cost_per_unit DECIMAL(10,2),
  quantity_available INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 0,
  supplier_name TEXT,
  supplier_contact JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Material usage tracking
CREATE TABLE public.material_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  quantity_used DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  cost_code TEXT,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Companies policies
CREATE POLICY "Users can view their own company" 
  ON public.companies FOR SELECT 
  USING (id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Company admins can update their company" 
  ON public.companies FOR UPDATE 
  USING (id IN (
    SELECT company_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Profiles policies
CREATE POLICY "Users can view profiles in their company" 
  ON public.profiles FOR SELECT 
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Projects policies
CREATE POLICY "Users can view projects in their company" 
  ON public.projects FOR SELECT 
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Project managers and admins can create projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  ));

CREATE POLICY "Project managers and admins can update projects" 
  ON public.projects FOR UPDATE 
  USING (company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  ));

-- Project assignments policies
CREATE POLICY "Users can view assignments in their company projects" 
  ON public.project_assignments FOR SELECT 
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON p.company_id = pr.company_id
    WHERE pr.user_id = auth.uid()
  ));

CREATE POLICY "Project managers can manage assignments" 
  ON public.project_assignments FOR ALL 
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON p.company_id = pr.company_id
    WHERE pr.user_id = auth.uid() AND pr.role IN ('admin', 'project_manager')
  ));

-- Time entries policies
CREATE POLICY "Users can view time entries for their projects" 
  ON public.time_entries FOR SELECT 
  USING (project_id IN (
    SELECT pa.project_id FROM public.project_assignments pa
    WHERE pa.user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can create their own time entries" 
  ON public.time_entries FOR INSERT 
  WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own time entries" 
  ON public.time_entries FOR UPDATE 
  USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Materials policies
CREATE POLICY "Users can view materials in their company" 
  ON public.materials FOR SELECT 
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins and managers can manage materials" 
  ON public.materials FOR ALL 
  USING (company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  ));

-- Material usage policies
CREATE POLICY "Users can view material usage for their projects" 
  ON public.material_usage FOR SELECT 
  USING (project_id IN (
    SELECT pa.project_id FROM public.project_assignments pa
    WHERE pa.user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can record material usage for their assigned projects" 
  ON public.material_usage FOR INSERT 
  WITH CHECK (
    project_id IN (
      SELECT pa.project_id FROM public.project_assignments pa
      WHERE pa.user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    ) AND 
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_project_assignments_project_id ON public.project_assignments(project_id);
CREATE INDEX idx_project_assignments_user_id ON public.project_assignments(user_id);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_clock_in_time ON public.time_entries(clock_in_time);
CREATE INDEX idx_materials_company_id ON public.materials(company_id);
CREATE INDEX idx_material_usage_project_id ON public.material_usage(project_id);
CREATE INDEX idx_material_usage_material_id ON public.material_usage(material_id);

-- Create trigger function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();