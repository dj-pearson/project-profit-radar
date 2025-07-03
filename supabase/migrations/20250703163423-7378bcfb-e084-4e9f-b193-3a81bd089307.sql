-- Create OSHA compliance tables

-- Safety incidents table
CREATE TABLE public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  incident_date DATE NOT NULL,
  incident_time TIME,
  reported_by UUID REFERENCES public.user_profiles(id),
  incident_type TEXT NOT NULL, -- 'injury', 'near_miss', 'property_damage', 'environmental'
  severity TEXT NOT NULL, -- 'minor', 'moderate', 'severe', 'fatality'
  description TEXT NOT NULL,
  location TEXT,
  injured_person_name TEXT,
  injured_person_job_title TEXT,
  body_part_affected TEXT,
  medical_attention_required BOOLEAN DEFAULT false,
  lost_time BOOLEAN DEFAULT false,
  days_away_from_work INTEGER DEFAULT 0,
  immediate_actions TEXT,
  root_cause_analysis TEXT,
  corrective_actions TEXT,
  photos TEXT[],
  witnesses TEXT[],
  osha_recordable BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'closed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Safety checklists table
CREATE TABLE public.safety_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  checklist_type TEXT NOT NULL, -- 'daily', 'weekly', 'project_start', 'equipment', 'custom'
  industry_type TEXT, -- 'residential', 'commercial', 'civil_infrastructure', 'specialty_trades'
  checklist_items JSONB NOT NULL, -- Array of checklist items with text, required flag, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Safety checklist responses table
CREATE TABLE public.safety_checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES public.safety_checklists(id) ON DELETE CASCADE,
  response_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_by UUID NOT NULL REFERENCES public.user_profiles(id),
  responses JSONB NOT NULL, -- Array of responses matching checklist items
  notes TEXT,
  photos TEXT[],
  issues_identified TEXT,
  corrective_actions TEXT,
  status TEXT DEFAULT 'completed', -- 'completed', 'issues_found', 'follow_up_required'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training certifications table
CREATE TABLE public.training_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  certification_type TEXT NOT NULL, -- 'osha_10', 'osha_30', 'first_aid', 'cpr', 'forklift', 'crane', 'custom'
  issuing_organization TEXT,
  certification_number TEXT,
  issue_date DATE,
  expiration_date DATE,
  renewal_required BOOLEAN DEFAULT true,
  document_url TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'pending_renewal'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- OSHA compliance deadlines table
CREATE TABLE public.osha_compliance_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deadline_type TEXT NOT NULL, -- 'osha_300_posting', 'training_renewal', 'inspection', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  notification_days INTEGER DEFAULT 30, -- Days before deadline to send notifications
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'overdue'
  related_entity_type TEXT, -- 'user', 'project', 'company'
  related_entity_id UUID,
  completed_date DATE,
  completed_by UUID REFERENCES public.user_profiles(id),
  notes TEXT,
  recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT, -- 'annual', 'monthly', 'quarterly'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Enable RLS on all tables
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osha_compliance_deadlines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for safety_incidents
CREATE POLICY "Users can view company safety incidents" 
ON public.safety_incidents FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Users can manage company safety incidents" 
ON public.safety_incidents FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role]));

-- RLS Policies for safety_checklists
CREATE POLICY "Users can view company safety checklists" 
ON public.safety_checklists FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage safety checklists" 
ON public.safety_checklists FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

-- RLS Policies for safety_checklist_responses
CREATE POLICY "Users can view company checklist responses" 
ON public.safety_checklist_responses FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Field staff can manage checklist responses" 
ON public.safety_checklist_responses FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role]));

-- RLS Policies for training_certifications
CREATE POLICY "Users can view company training certifications" 
ON public.training_certifications FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage training certifications" 
ON public.training_certifications FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role]));

-- RLS Policies for osha_compliance_deadlines
CREATE POLICY "Users can view company compliance deadlines" 
ON public.osha_compliance_deadlines FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage compliance deadlines" 
ON public.osha_compliance_deadlines FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role]));

-- Create indexes for better performance
CREATE INDEX idx_safety_incidents_company_date ON public.safety_incidents(company_id, incident_date DESC);
CREATE INDEX idx_safety_incidents_project ON public.safety_incidents(project_id);
CREATE INDEX idx_safety_checklist_responses_project_date ON public.safety_checklist_responses(project_id, response_date DESC);
CREATE INDEX idx_training_certifications_user_expiration ON public.training_certifications(user_id, expiration_date);
CREATE INDEX idx_compliance_deadlines_company_due_date ON public.osha_compliance_deadlines(company_id, due_date);

-- Create trigger for updating updated_at timestamps
CREATE TRIGGER update_safety_incidents_updated_at
  BEFORE UPDATE ON public.safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safety_checklists_updated_at
  BEFORE UPDATE ON public.safety_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safety_checklist_responses_updated_at
  BEFORE UPDATE ON public.safety_checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_certifications_updated_at
  BEFORE UPDATE ON public.training_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_osha_compliance_deadlines_updated_at
  BEFORE UPDATE ON public.osha_compliance_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();