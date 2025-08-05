-- Create workflow management tables with proper function references

-- 1. Enhanced Change Orders table (if doesn't exist)
CREATE TABLE IF NOT EXISTS public.change_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  justification TEXT,
  category TEXT DEFAULT 'scope_change',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  requested_by UUID,
  assigned_to UUID,
  approved_by UUID,
  amount DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  material_cost DECIMAL(12,2) DEFAULT 0,
  equipment_cost DECIMAL(12,2) DEFAULT 0,
  overhead_cost DECIMAL(12,2) DEFAULT 0,
  impact_days INTEGER DEFAULT 0,
  original_completion_date DATE,
  revised_completion_date DATE,
  attachments JSONB DEFAULT '[]',
  approval_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  implemented_at TIMESTAMP WITH TIME ZONE
);

-- 2. Enhanced Quality Control & Punch Lists
CREATE TABLE IF NOT EXISTS public.quality_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  inspection_number TEXT NOT NULL,
  inspection_type TEXT NOT NULL,
  phase TEXT,
  location TEXT,
  inspector_id UUID,
  inspection_date DATE NOT NULL,
  status TEXT DEFAULT 'scheduled',
  checklist_items JSONB DEFAULT '[]',
  deficiencies JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  notes TEXT,
  passed BOOLEAN,
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Client Communications table
CREATE TABLE IF NOT EXISTS public.client_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  client_contact_id UUID,
  communication_type TEXT DEFAULT 'email',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  priority TEXT DEFAULT 'normal',
  sent_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  attachments JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'change_orders' AND schemaname = 'public') THEN
    ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage company change orders" ON public.change_orders
      FOR ALL USING (company_id = get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quality_inspections' AND schemaname = 'public') THEN  
    ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage company quality inspections" ON public.quality_inspections
      FOR ALL USING (company_id = get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_communications' AND schemaname = 'public') THEN
    ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage company client communications" ON public.client_communications
      FOR ALL USING (company_id = get_user_company(auth.uid()));
  END IF;
END $$;