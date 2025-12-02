-- Create RFIs table
CREATE TABLE public.rfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  submitted_to TEXT,
  due_date DATE,
  response_date DATE,
  status TEXT DEFAULT 'submitted',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Submittals table
CREATE TABLE public.submittals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submittal_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  spec_section TEXT,
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  submitted_date DATE,
  approved_date DATE,
  status TEXT DEFAULT 'submitted',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Punch List Items table
CREATE TABLE public.punch_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_number TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  trade TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date_identified DATE DEFAULT CURRENT_DATE,
  date_completed DATE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_list_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for RFIs
CREATE POLICY "Staff can manage company RFIs"
ON public.rfis
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = rfis.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

CREATE POLICY "Users can view company RFIs"
ON public.rfis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = rfis.project_id 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

-- Create RLS policies for Submittals
CREATE POLICY "Staff can manage company submittals"
ON public.submittals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = submittals.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

CREATE POLICY "Users can view company submittals"
ON public.submittals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = submittals.project_id 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

-- Create RLS policies for Punch List Items
CREATE POLICY "Staff can manage company punch list items"
ON public.punch_list_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = punch_list_items.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role])
  )
);

CREATE POLICY "Users can view company punch list items"
ON public.punch_list_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = punch_list_items.project_id 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_rfis_updated_at
  BEFORE UPDATE ON public.rfis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submittals_updated_at
  BEFORE UPDATE ON public.submittals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_punch_list_items_updated_at
  BEFORE UPDATE ON public.punch_list_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();