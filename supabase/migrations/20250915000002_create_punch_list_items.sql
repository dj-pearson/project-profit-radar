-- Create punch_list_items table for project completion tracking
CREATE TABLE IF NOT EXISTS public.punch_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Item details
  item_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  
  -- Classification
  category TEXT CHECK (category IN ('deficiency', 'incomplete_work', 'cleanup', 'touch_up', 'safety', 'code_compliance', 'other')) DEFAULT 'deficiency',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  trade TEXT, -- e.g., 'electrical', 'plumbing', 'hvac', 'general'
  
  -- Status and tracking
  status TEXT CHECK (status IN ('open', 'in_progress', 'completed', 'verified', 'closed')) DEFAULT 'open',
  
  -- Assignment
  assigned_to UUID REFERENCES public.user_profiles(id),
  assigned_company TEXT, -- For subcontractors
  
  -- Dates
  date_identified DATE NOT NULL DEFAULT CURRENT_DATE,
  target_completion_date DATE,
  date_completed DATE,
  date_verified DATE,
  
  -- Photos and documentation
  photo_before_url TEXT,
  photo_after_url TEXT,
  additional_photos JSONB DEFAULT '[]'::jsonb,
  
  -- Cost impact
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  actual_cost DECIMAL(10,2),
  
  -- Notes and comments
  notes TEXT,
  completion_notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES public.user_profiles(id),
  completed_by UUID REFERENCES public.user_profiles(id),
  verified_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.punch_list_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view punch list items for their company projects"
ON public.punch_list_items FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    WHERE p.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "Users can manage punch list items for their company projects"
ON public.punch_list_items FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'superintendent', 'foreman', 'office_staff', 'root_admin']::user_role[])
);

-- Create indexes
CREATE INDEX idx_punch_list_items_project_id ON public.punch_list_items(project_id);
CREATE INDEX idx_punch_list_items_company_id ON public.punch_list_items(company_id);
CREATE INDEX idx_punch_list_items_status ON public.punch_list_items(status);
CREATE INDEX idx_punch_list_items_priority ON public.punch_list_items(priority);
CREATE INDEX idx_punch_list_items_assigned_to ON public.punch_list_items(assigned_to);
CREATE INDEX idx_punch_list_items_date_identified ON public.punch_list_items(date_identified);

-- Create trigger for updated_at
CREATE TRIGGER update_punch_list_items_updated_at
  BEFORE UPDATE ON public.punch_list_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
