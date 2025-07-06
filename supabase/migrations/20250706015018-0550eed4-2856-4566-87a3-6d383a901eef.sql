-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can view company safety incidents" ON public.safety_incidents;
DROP POLICY IF EXISTS "Field staff can manage safety incidents" ON public.safety_incidents;
DROP POLICY IF EXISTS "Users can view company safety checklists" ON public.safety_checklists;
DROP POLICY IF EXISTS "Managers can manage safety checklists" ON public.safety_checklists;
DROP POLICY IF EXISTS "Users can view company checklist responses" ON public.safety_checklist_responses;
DROP POLICY IF EXISTS "Field staff can manage checklist responses" ON public.safety_checklist_responses;
DROP POLICY IF EXISTS "Users can view company training certifications" ON public.training_certifications;
DROP POLICY IF EXISTS "Managers can manage training certifications" ON public.training_certifications;
DROP POLICY IF EXISTS "Users can view company compliance deadlines" ON public.osha_compliance_deadlines;
DROP POLICY IF EXISTS "Managers can manage compliance deadlines" ON public.osha_compliance_deadlines;

-- Enable RLS (if not already enabled)
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