-- Create safety_incidents table if not exists
CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  incident_date DATE NOT NULL,
  incident_time TIME,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('injury', 'near_miss', 'property_damage', 'environmental')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'fatality')),
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
  witnesses TEXT[],
  osha_recordable BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'closed')),
  reported_by UUID REFERENCES public.user_profiles(id),
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create safety_checklists table if not exists
CREATE TABLE IF NOT EXISTS public.safety_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('daily', 'weekly', 'project_start', 'equipment', 'custom')),
  industry_type TEXT CHECK (industry_type IN ('residential', 'commercial', 'civil_infrastructure', 'specialty_trades')),
  checklist_items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create safety_checklist_responses table if not exists
CREATE TABLE IF NOT EXISTS public.safety_checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES public.safety_checklists(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  response_date DATE NOT NULL DEFAULT CURRENT_DATE,
  responses JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  completed_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_certifications table if not exists
CREATE TABLE IF NOT EXISTS public.training_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL,
  training_provider TEXT,
  completion_date DATE NOT NULL,
  expiration_date DATE,
  certificate_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  renewal_reminder_sent BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create osha_compliance_deadlines table if not exists
CREATE TABLE IF NOT EXISTS public.osha_compliance_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  compliance_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  assigned_to UUID REFERENCES public.user_profiles(id),
  completion_date DATE,
  completion_notes TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osha_compliance_deadlines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for safety_incidents
CREATE POLICY "Users can view company safety incidents"
ON public.safety_incidents FOR SELECT
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Field staff can manage safety incidents"
ON public.safety_incidents FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'root_admin']::user_role[])
);

-- RLS Policies for safety_checklists
CREATE POLICY "Users can view company safety checklists"
ON public.safety_checklists FOR SELECT
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage safety checklists" 
ON public.safety_checklists FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'root_admin']::user_role[])
);

-- RLS Policies for safety_checklist_responses
CREATE POLICY "Users can view company checklist responses"
ON public.safety_checklist_responses FOR SELECT
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Field staff can manage checklist responses"
ON public.safety_checklist_responses FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'root_admin']::user_role[])
);

-- RLS Policies for training_certifications
CREATE POLICY "Users can view company training certifications"
ON public.training_certifications FOR SELECT
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage training certifications"
ON public.training_certifications FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

-- RLS Policies for osha_compliance_deadlines
CREATE POLICY "Users can view company compliance deadlines"
ON public.osha_compliance_deadlines FOR SELECT
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage compliance deadlines"
ON public.osha_compliance_deadlines FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']::user_role[])
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_safety_incidents_company_id ON public.safety_incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_date ON public.safety_incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON public.safety_incidents(status);

CREATE INDEX IF NOT EXISTS idx_safety_checklists_company_id ON public.safety_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklists_type ON public.safety_checklists(checklist_type);

CREATE INDEX IF NOT EXISTS idx_safety_checklist_responses_company_id ON public.safety_checklist_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklist_responses_date ON public.safety_checklist_responses(response_date);

CREATE INDEX IF NOT EXISTS idx_training_certifications_company_id ON public.training_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_training_certifications_expiration ON public.training_certifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_training_certifications_status ON public.training_certifications(status);

CREATE INDEX IF NOT EXISTS idx_osha_compliance_deadlines_company_id ON public.osha_compliance_deadlines(company_id);
CREATE INDEX IF NOT EXISTS idx_osha_compliance_deadlines_due_date ON public.osha_compliance_deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_osha_compliance_deadlines_status ON public.osha_compliance_deadlines(status);

-- Add triggers for updated_at
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

-- Add comments
COMMENT ON TABLE public.safety_incidents IS 'Safety incidents and near misses tracking';
COMMENT ON TABLE public.safety_checklists IS 'Safety checklist templates';
COMMENT ON TABLE public.safety_checklist_responses IS 'Completed safety checklist responses';
COMMENT ON TABLE public.training_certifications IS 'Employee training and certifications';
COMMENT ON TABLE public.osha_compliance_deadlines IS 'OSHA compliance deadlines and requirements';