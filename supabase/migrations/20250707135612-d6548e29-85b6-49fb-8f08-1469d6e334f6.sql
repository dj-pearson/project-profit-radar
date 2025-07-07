-- Create public procurement and bid management tables
CREATE TABLE public.procurement_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Opportunity details
  opportunity_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  issuing_agency TEXT NOT NULL,
  agency_contact_name TEXT,
  agency_contact_email TEXT,
  agency_contact_phone TEXT,
  
  -- Procurement details
  procurement_type TEXT NOT NULL CHECK (procurement_type IN ('sealed_bid', 'request_for_proposal', 'request_for_qualifications', 'small_purchase', 'emergency', 'sole_source', 'cooperative', 'other')),
  project_category TEXT CHECK (project_category IN ('construction', 'professional_services', 'supplies', 'maintenance', 'consulting', 'other')),
  estimated_value NUMERIC(12,2),
  contract_duration_months INTEGER,
  
  -- Important dates
  published_date DATE,
  pre_bid_meeting_date TIMESTAMP WITH TIME ZONE,
  questions_due_date TIMESTAMP WITH TIME ZONE,
  submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  award_date DATE,
  contract_start_date DATE,
  
  -- Requirements
  minimum_experience_years INTEGER DEFAULT 0,
  license_requirements TEXT[],
  insurance_requirements JSONB DEFAULT '[]'::jsonb,
  bond_requirements JSONB DEFAULT '[]'::jsonb,
  certification_requirements TEXT[],
  mbe_wbe_requirements JSONB DEFAULT '{}'::jsonb,
  
  -- Location and scope
  project_location TEXT,
  work_scope TEXT,
  special_requirements TEXT,
  
  -- Documents and links
  solicitation_document_url TEXT,
  addenda_urls TEXT[],
  submission_portal_url TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled', 'withdrawn')),
  is_watched BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bid submissions table
CREATE TABLE public.bid_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.procurement_opportunities(id) ON DELETE CASCADE,
  
  -- Bid details
  bid_number TEXT,
  bid_amount NUMERIC(12,2) NOT NULL,
  bid_bond_amount NUMERIC(12,2) DEFAULT 0,
  performance_bond_percentage NUMERIC(5,2) DEFAULT 100.00,
  payment_bond_percentage NUMERIC(5,2) DEFAULT 100.00,
  
  -- Submission details
  submitted_at TIMESTAMP WITH TIME ZONE,
  submission_method TEXT CHECK (submission_method IN ('electronic', 'physical', 'email', 'portal')),
  confirmation_number TEXT,
  
  -- Bid components
  base_bid_amount NUMERIC(12,2),
  alternate_amounts JSONB DEFAULT '[]'::jsonb, -- Array of alternate bid amounts
  unit_prices JSONB DEFAULT '[]'::jsonb, -- Unit price breakdown
  allowances JSONB DEFAULT '[]'::jsonb, -- Allowance items
  
  -- Timeline
  proposed_start_date DATE,
  proposed_completion_date DATE,
  project_duration_days INTEGER,
  
  -- Team and capacity
  project_manager_name TEXT,
  key_personnel JSONB DEFAULT '[]'::jsonb,
  equipment_list JSONB DEFAULT '[]'::jsonb,
  
  -- Compliance
  addenda_acknowledged TEXT[], -- List of acknowledged addenda
  exceptions_taken TEXT,
  substitutions_requested JSONB DEFAULT '[]'::jsonb,
  
  -- Documents
  bid_documents_path TEXT,
  technical_proposal_path TEXT,
  cost_proposal_path TEXT,
  
  -- Status and outcome
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'submitted', 'under_review', 'awarded', 'not_awarded', 'withdrawn')),
  award_notification_date DATE,
  award_amount NUMERIC(12,2),
  ranking INTEGER, -- Bid ranking if disclosed
  
  -- Follow-up
  debriefing_requested BOOLEAN DEFAULT false,
  debriefing_date DATE,
  protest_filed BOOLEAN DEFAULT false,
  protest_outcome TEXT,
  
  -- Notes and lessons learned
  notes TEXT,
  lessons_learned TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcontractor disclosures table
CREATE TABLE public.subcontractor_disclosures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_submission_id UUID NOT NULL REFERENCES public.bid_submissions(id) ON DELETE CASCADE,
  
  -- Subcontractor information
  subcontractor_name TEXT NOT NULL,
  business_address TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  license_classification TEXT,
  
  -- Business details
  business_structure TEXT CHECK (business_structure IN ('corporation', 'llc', 'partnership', 'sole_proprietorship', 'other')),
  tax_id TEXT,
  duns_number TEXT,
  
  -- Work scope
  work_category TEXT NOT NULL,
  work_description TEXT NOT NULL,
  subcontract_amount NUMERIC(12,2) NOT NULL,
  percentage_of_total NUMERIC(5,2),
  
  -- Dates
  proposed_start_date DATE,
  proposed_completion_date DATE,
  
  -- Certifications and compliance
  is_mbe_certified BOOLEAN DEFAULT false,
  is_wbe_certified BOOLEAN DEFAULT false,
  is_dbe_certified BOOLEAN DEFAULT false,
  is_veteran_owned BOOLEAN DEFAULT false,
  is_small_business BOOLEAN DEFAULT false,
  certification_numbers TEXT[],
  
  -- Previous work
  previous_work_description TEXT,
  references JSONB DEFAULT '[]'::jsonb,
  
  -- Insurance and bonding
  has_required_insurance BOOLEAN DEFAULT false,
  insurance_carrier TEXT,
  insurance_policy_number TEXT,
  insurance_expiry_date DATE,
  bonding_capacity NUMERIC(12,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'substituted', 'removed')),
  approval_date DATE,
  
  -- Documentation
  w9_form_path TEXT,
  insurance_certificate_path TEXT,
  license_copy_path TEXT,
  certification_documents_path TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bid documents table
CREATE TABLE public.bid_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_submission_id UUID REFERENCES public.bid_submissions(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.procurement_opportunities(id) ON DELETE CASCADE,
  
  -- Document details
  document_type TEXT NOT NULL CHECK (document_type IN ('bid_form', 'technical_proposal', 'cost_proposal', 'qualification_statement', 'bond', 'insurance_certificate', 'license_copy', 'references', 'project_schedule', 'safety_plan', 'quality_plan', 'subcontractor_list', 'mbe_wbe_form', 'addendum_acknowledgment', 'other')),
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  
  -- Status
  is_required BOOLEAN DEFAULT false,
  is_submitted BOOLEAN DEFAULT false,
  submission_date TIMESTAMP WITH TIME ZONE,
  
  -- Version control
  version_number INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT true,
  supersedes_document_id UUID REFERENCES public.bid_documents(id),
  
  -- Notes
  description TEXT,
  notes TEXT,
  
  -- Tracking
  uploaded_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procurement requirements tracking table
CREATE TABLE public.procurement_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.procurement_opportunities(id) ON DELETE CASCADE,
  bid_submission_id UUID REFERENCES public.bid_submissions(id) ON DELETE CASCADE,
  
  -- Requirement details
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('license', 'insurance', 'bond', 'certification', 'experience', 'financial', 'reference', 'mbe_wbe', 'safety', 'quality', 'environmental', 'other')),
  requirement_name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Compliance tracking
  is_required BOOLEAN DEFAULT true,
  is_met BOOLEAN DEFAULT false,
  compliance_date DATE,
  compliance_notes TEXT,
  
  -- Documentation
  evidence_document_path TEXT,
  verification_method TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'compliant', 'non_compliant', 'waived', 'not_applicable')),
  verified_by TEXT, -- Agency or third party verifier
  verification_date DATE,
  
  -- Follow-up
  deficiency_description TEXT,
  correction_deadline DATE,
  corrective_action_taken TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procurement_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for procurement opportunities
CREATE POLICY "Users can view company procurement opportunities" 
ON public.procurement_opportunities 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage procurement opportunities" 
ON public.procurement_opportunities 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for bid submissions
CREATE POLICY "Users can view company bid submissions" 
ON public.bid_submissions 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage bid submissions" 
ON public.bid_submissions 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for subcontractor disclosures
CREATE POLICY "Users can view company subcontractor disclosures" 
ON public.subcontractor_disclosures 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bid_submissions bs 
    WHERE bs.id = subcontractor_disclosures.bid_submission_id 
    AND (bs.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage subcontractor disclosures" 
ON public.subcontractor_disclosures 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.bid_submissions bs 
    WHERE bs.id = subcontractor_disclosures.bid_submission_id 
    AND bs.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- RLS Policies for bid documents
CREATE POLICY "Users can view company bid documents" 
ON public.bid_documents 
FOR SELECT 
USING (
  (bid_submission_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bid_submissions bs 
    WHERE bs.id = bid_documents.bid_submission_id 
    AND (bs.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )) OR
  (opportunity_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.procurement_opportunities po 
    WHERE po.id = bid_documents.opportunity_id 
    AND (po.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  ))
);

CREATE POLICY "Staff can manage bid documents" 
ON public.bid_documents 
FOR ALL 
USING (
  ((bid_submission_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bid_submissions bs 
    WHERE bs.id = bid_documents.bid_submission_id 
    AND bs.company_id = get_user_company(auth.uid())
  )) OR
  (opportunity_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.procurement_opportunities po 
    WHERE po.id = bid_documents.opportunity_id 
    AND po.company_id = get_user_company(auth.uid())
  )))
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for procurement requirements
CREATE POLICY "Users can view company procurement requirements" 
ON public.procurement_requirements 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.procurement_opportunities po 
    WHERE po.id = procurement_requirements.opportunity_id 
    AND (po.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage procurement requirements" 
ON public.procurement_requirements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.procurement_opportunities po 
    WHERE po.id = procurement_requirements.opportunity_id 
    AND po.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_procurement_opportunities_updated_at
  BEFORE UPDATE ON public.procurement_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bid_submissions_updated_at
  BEFORE UPDATE ON public.bid_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcontractor_disclosures_updated_at
  BEFORE UPDATE ON public.subcontractor_disclosures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bid_documents_updated_at
  BEFORE UPDATE ON public.bid_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_procurement_requirements_updated_at
  BEFORE UPDATE ON public.procurement_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_procurement_opportunities_company ON public.procurement_opportunities(company_id);
CREATE INDEX idx_procurement_opportunities_deadline ON public.procurement_opportunities(submission_deadline);
CREATE INDEX idx_procurement_opportunities_status ON public.procurement_opportunities(status);
CREATE INDEX idx_bid_submissions_company_opportunity ON public.bid_submissions(company_id, opportunity_id);
CREATE INDEX idx_bid_submissions_status ON public.bid_submissions(status);
CREATE INDEX idx_subcontractor_disclosures_bid ON public.subcontractor_disclosures(bid_submission_id);
CREATE INDEX idx_bid_documents_submission ON public.bid_documents(bid_submission_id);
CREATE INDEX idx_bid_documents_opportunity ON public.bid_documents(opportunity_id);
CREATE INDEX idx_procurement_requirements_opportunity ON public.procurement_requirements(opportunity_id);

-- Create function to generate bid numbers
CREATE OR REPLACE FUNCTION public.generate_bid_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  bid_num TEXT;
BEGIN
  SELECT nextval('public.bid_number_seq') INTO next_num;
  bid_num := 'BID-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN bid_num;
END;
$$;

-- Create sequence for bid numbers
CREATE SEQUENCE IF NOT EXISTS public.bid_number_seq START 1;

-- Create trigger to set bid number
CREATE OR REPLACE FUNCTION public.set_bid_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.bid_number IS NULL OR NEW.bid_number = '' THEN
    NEW.bid_number := generate_bid_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_bid_number_trigger
  BEFORE INSERT ON public.bid_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bid_number();