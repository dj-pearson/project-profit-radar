-- Create workflow management tables

-- 1. Enhanced Change Orders table (if doesn't exist)
CREATE TABLE IF NOT EXISTS public.change_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
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
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
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

-- 3. RFIs table (enhance existing if needed)
CREATE TABLE IF NOT EXISTS public.rfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  requested_by UUID,
  assigned_to UUID,
  due_date DATE,
  response TEXT,
  response_date DATE,
  attachments JSONB DEFAULT '[]',
  cost_impact DECIMAL(12,2) DEFAULT 0,
  schedule_impact_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Submittals table
CREATE TABLE IF NOT EXISTS public.submittals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  specification_section TEXT,
  submittal_type TEXT DEFAULT 'shop_drawings',
  status TEXT DEFAULT 'not_submitted',
  priority TEXT DEFAULT 'medium',
  submitted_by UUID,
  reviewed_by UUID,
  approved_by UUID,
  due_date DATE,
  submitted_date DATE,
  reviewed_date DATE,
  approved_date DATE,
  revision_number INTEGER DEFAULT 1,
  files JSONB DEFAULT '[]',
  review_comments TEXT,
  rejection_reason TEXT,
  resubmission_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Client Communications table
CREATE TABLE IF NOT EXISTS public.client_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID,
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

-- Enable RLS
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage company change orders" ON public.change_orders
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company quality inspections" ON public.quality_inspections
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company RFIs" ON public.rfis
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company submittals" ON public.submittals
  FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company client communications" ON public.client_communications
  FOR ALL USING (company_id = get_user_company(auth.uid()));

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_inspections_updated_at BEFORE UPDATE ON public.quality_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfis_updated_at BEFORE UPDATE ON public.rfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submittals_updated_at BEFORE UPDATE ON public.submittals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_communications_updated_at BEFORE UPDATE ON public.client_communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();