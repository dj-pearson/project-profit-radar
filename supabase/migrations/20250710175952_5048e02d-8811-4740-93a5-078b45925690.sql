-- Create CRM tables for leads, opportunities, and contacts

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  job_title TEXT,
  project_name TEXT,
  project_type TEXT,
  project_description TEXT,
  project_address TEXT,
  project_city TEXT,
  project_state TEXT,
  project_zip TEXT,
  estimated_budget NUMERIC,
  budget_range TEXT,
  desired_start_date DATE,
  desired_completion_date DATE,
  timeline_flexibility TEXT,
  lead_source TEXT NOT NULL DEFAULT 'website',
  lead_source_detail TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  property_type TEXT,
  permits_required BOOLEAN DEFAULT false,
  hoa_approval_needed BOOLEAN DEFAULT false,
  financing_secured BOOLEAN DEFAULT false,
  financing_type TEXT,
  site_accessible BOOLEAN DEFAULT true,
  site_conditions TEXT,
  decision_maker BOOLEAN DEFAULT false,
  decision_timeline TEXT,
  next_follow_up_date DATE,
  last_contact_date DATE,
  notes TEXT,
  tags TEXT[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lead_id UUID,
  contact_id UUID,
  project_id UUID,
  estimated_value NUMERIC NOT NULL,
  probability_percent INTEGER NOT NULL DEFAULT 50,
  expected_close_date DATE,
  stage TEXT NOT NULL DEFAULT 'prospecting',
  pipeline_position INTEGER DEFAULT 1,
  project_type TEXT,
  bid_required BOOLEAN DEFAULT false,
  bid_due_date DATE,
  proposal_sent_date DATE,
  contract_signed_date DATE,
  competitor_names TEXT[],
  our_competitive_advantage TEXT,
  key_decision_factors TEXT[],
  account_manager UUID,
  estimator UUID,
  project_manager UUID,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  risk_factors TEXT[],
  mitigation_strategies TEXT,
  close_date DATE,
  close_reason TEXT,
  actual_value NUMERIC,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  company_name TEXT,
  job_title TEXT,
  department TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'United States',
  website TEXT,
  linkedin_profile TEXT,
  contact_type TEXT NOT NULL DEFAULT 'prospect',
  relationship_status TEXT NOT NULL DEFAULT 'active',
  preferred_contact_method TEXT DEFAULT 'email',
  time_zone TEXT,
  birthday DATE,
  anniversary DATE,
  lead_source TEXT,
  assigned_to UUID,
  last_contact_date DATE,
  next_contact_date DATE,
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.leads
  ADD CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id),
  ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  ADD CONSTRAINT opportunities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  ADD CONSTRAINT opportunities_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  ADD CONSTRAINT opportunities_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  ADD CONSTRAINT opportunities_account_manager_fkey FOREIGN KEY (account_manager) REFERENCES public.user_profiles(id),
  ADD CONSTRAINT opportunities_estimator_fkey FOREIGN KEY (estimator) REFERENCES public.user_profiles(id),
  ADD CONSTRAINT opportunities_project_manager_fkey FOREIGN KEY (project_manager) REFERENCES public.user_profiles(id);

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  ADD CONSTRAINT contacts_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id),
  ADD CONSTRAINT contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leads
CREATE POLICY "Staff can manage company leads" ON public.leads
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view company leads" ON public.leads
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR
    get_user_role(auth.uid()) = 'root_admin'::user_role
  );

-- Create RLS policies for opportunities
CREATE POLICY "Staff can manage company opportunities" ON public.opportunities
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view company opportunities" ON public.opportunities
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR
    get_user_role(auth.uid()) = 'root_admin'::user_role
  );

-- Create RLS policies for contacts
CREATE POLICY "Staff can manage company contacts" ON public.contacts
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Users can view company contacts" ON public.contacts
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR
    get_user_role(auth.uid()) = 'root_admin'::user_role
  );

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_leads_company_id ON public.leads(company_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);

CREATE INDEX idx_opportunities_company_id ON public.opportunities(company_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunities_account_manager ON public.opportunities(account_manager);
CREATE INDEX idx_opportunities_created_at ON public.opportunities(created_at);

CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_contact_type ON public.contacts(contact_type);
CREATE INDEX idx_contacts_assigned_to ON public.contacts(assigned_to);
CREATE INDEX idx_contacts_created_at ON public.contacts(created_at);