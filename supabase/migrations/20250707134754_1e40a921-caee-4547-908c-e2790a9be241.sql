-- Create bonding and insurance tracking tables
CREATE TABLE public.bonds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Bond details
  bond_type TEXT NOT NULL CHECK (bond_type IN ('performance', 'payment', 'bid', 'maintenance', 'supply', 'subdivision', 'license', 'court', 'fidelity', 'other')),
  bond_number TEXT NOT NULL,
  bond_name TEXT NOT NULL,
  description TEXT,
  
  -- Coverage details
  bond_amount NUMERIC(12,2) NOT NULL,
  premium_amount NUMERIC(10,2) DEFAULT 0,
  bond_percentage NUMERIC(5,2) DEFAULT 100.00, -- Percentage of contract covered
  
  -- Parties involved
  principal_name TEXT NOT NULL, -- The contractor
  obligee_name TEXT NOT NULL, -- The project owner/beneficiary
  surety_company TEXT NOT NULL,
  surety_contact_name TEXT,
  surety_contact_phone TEXT,
  surety_contact_email TEXT,
  
  -- Agent/broker information
  agent_company TEXT,
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  
  -- Dates and status
  effective_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issued_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'claimed', 'released')),
  
  -- Documents and notes
  bond_document_path TEXT,
  certificate_path TEXT,
  notes TEXT,
  
  -- Claim information
  claim_made BOOLEAN DEFAULT false,
  claim_amount NUMERIC(12,2) DEFAULT 0,
  claim_date DATE,
  claim_status TEXT CHECK (claim_status IN ('pending', 'approved', 'denied', 'settled')),
  claim_notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create insurance policies table
CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Policy details
  policy_type TEXT NOT NULL CHECK (policy_type IN ('general_liability', 'workers_compensation', 'professional_liability', 'commercial_auto', 'builders_risk', 'umbrella', 'cyber_liability', 'employment_practices', 'directors_officers', 'other')),
  policy_number TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  description TEXT,
  
  -- Coverage details
  coverage_limit NUMERIC(12,2) NOT NULL,
  deductible NUMERIC(10,2) DEFAULT 0,
  aggregate_limit NUMERIC(12,2),
  per_occurrence_limit NUMERIC(12,2),
  premium_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Insurance company details
  insurance_company TEXT NOT NULL,
  insurance_company_rating TEXT, -- AM Best rating
  carrier_contact_name TEXT,
  carrier_contact_phone TEXT,
  carrier_contact_email TEXT,
  
  -- Agent/broker information
  agent_company TEXT,
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  
  -- Dates and status
  effective_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issued_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'suspended')),
  
  -- Additional insured and certificates
  additional_insured_required BOOLEAN DEFAULT false,
  waiver_of_subrogation BOOLEAN DEFAULT false,
  primary_non_contributory BOOLEAN DEFAULT false,
  
  -- Documents and notes
  policy_document_path TEXT,
  certificate_path TEXT,
  declarations_page_path TEXT,
  notes TEXT,
  
  -- Claims information
  claims_made BOOLEAN DEFAULT false,
  total_claims_amount NUMERIC(12,2) DEFAULT 0,
  claims_count INTEGER DEFAULT 0,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project bond requirements table
CREATE TABLE public.project_bond_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bond_id UUID REFERENCES public.bonds(id) ON DELETE SET NULL,
  
  -- Requirement details
  bond_type TEXT NOT NULL,
  required_amount NUMERIC(12,2) NOT NULL,
  required_percentage NUMERIC(5,2) DEFAULT 100.00,
  requirement_description TEXT,
  
  -- Status
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_satisfied BOOLEAN NOT NULL DEFAULT false,
  satisfied_date DATE,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project insurance requirements table
CREATE TABLE public.project_insurance_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  insurance_policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  
  -- Requirement details
  insurance_type TEXT NOT NULL,
  minimum_coverage NUMERIC(12,2) NOT NULL,
  minimum_aggregate NUMERIC(12,2),
  maximum_deductible NUMERIC(10,2),
  requirement_description TEXT,
  
  -- Special requirements
  additional_insured_required BOOLEAN DEFAULT false,
  waiver_of_subrogation_required BOOLEAN DEFAULT false,
  primary_non_contributory_required BOOLEAN DEFAULT false,
  certificate_holder TEXT,
  
  -- Status
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_satisfied BOOLEAN NOT NULL DEFAULT false,
  satisfied_date DATE,
  certificate_received BOOLEAN DEFAULT false,
  certificate_expiry_date DATE,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create insurance claims table
CREATE TABLE public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insurance_policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Claim details
  claim_number TEXT NOT NULL,
  claim_date DATE NOT NULL,
  incident_date DATE NOT NULL,
  claim_type TEXT NOT NULL,
  claim_description TEXT NOT NULL,
  
  -- Financial details
  claim_amount NUMERIC(12,2) NOT NULL,
  deductible_amount NUMERIC(10,2) DEFAULT 0,
  settlement_amount NUMERIC(12,2) DEFAULT 0,
  reserve_amount NUMERIC(12,2) DEFAULT 0,
  
  -- Status and resolution
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'pending', 'approved', 'denied', 'settled', 'closed')),
  resolution_date DATE,
  resolution_notes TEXT,
  
  -- Parties involved
  claimant_name TEXT,
  claimant_contact TEXT,
  adjuster_name TEXT,
  adjuster_company TEXT,
  adjuster_contact TEXT,
  
  -- Documents
  claim_documents_path TEXT,
  photos_path TEXT,
  correspondence_log JSONB DEFAULT '[]'::jsonb,
  
  -- Impact
  affects_premium BOOLEAN DEFAULT false,
  premium_impact_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_bond_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_insurance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonds
CREATE POLICY "Users can view company bonds" 
ON public.bonds 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage company bonds" 
ON public.bonds 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'accounting'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for insurance policies
CREATE POLICY "Users can view company insurance policies" 
ON public.insurance_policies 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage company insurance policies" 
ON public.insurance_policies 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'accounting'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for project bond requirements
CREATE POLICY "Users can view company project bond requirements" 
ON public.project_bond_requirements 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_bond_requirements.project_id 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage project bond requirements" 
ON public.project_bond_requirements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_bond_requirements.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'accounting'::user_role, 'root_admin'::user_role])
  )
);

-- RLS Policies for project insurance requirements
CREATE POLICY "Users can view company project insurance requirements" 
ON public.project_insurance_requirements 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_insurance_requirements.project_id 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage project insurance requirements" 
ON public.project_insurance_requirements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_insurance_requirements.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'accounting'::user_role, 'root_admin'::user_role])
  )
);

-- RLS Policies for insurance claims
CREATE POLICY "Users can view company insurance claims" 
ON public.insurance_claims 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.insurance_policies ip 
    WHERE ip.id = insurance_claims.insurance_policy_id 
    AND (ip.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage insurance claims" 
ON public.insurance_claims 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.insurance_policies ip 
    WHERE ip.id = insurance_claims.insurance_policy_id 
    AND ip.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'accounting'::user_role, 'root_admin'::user_role])
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_bonds_updated_at
  BEFORE UPDATE ON public.bonds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_policies_updated_at
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_bond_requirements_updated_at
  BEFORE UPDATE ON public.project_bond_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_insurance_requirements_updated_at
  BEFORE UPDATE ON public.project_insurance_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_bonds_company_project ON public.bonds(company_id, project_id);
CREATE INDEX idx_bonds_expiry ON public.bonds(expiry_date);
CREATE INDEX idx_bonds_status ON public.bonds(status);
CREATE INDEX idx_insurance_policies_company ON public.insurance_policies(company_id);
CREATE INDEX idx_insurance_policies_expiry ON public.insurance_policies(expiry_date);
CREATE INDEX idx_insurance_policies_type ON public.insurance_policies(policy_type);
CREATE INDEX idx_project_bond_requirements_project ON public.project_bond_requirements(project_id);
CREATE INDEX idx_project_insurance_requirements_project ON public.project_insurance_requirements(project_id);
CREATE INDEX idx_insurance_claims_policy ON public.insurance_claims(insurance_policy_id);
CREATE INDEX idx_insurance_claims_project ON public.insurance_claims(project_id);

-- Create function to check project bond/insurance requirements based on contract value
CREATE OR REPLACE FUNCTION public.check_project_requirements(p_project_id UUID, p_contract_value NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bond_threshold NUMERIC := 35000; -- $35K threshold
  insurance_threshold NUMERIC := 35000; -- $35K threshold
  result JSONB := '{"bonds_required": false, "insurance_required": false, "requirements": []}'::jsonb;
  requirements JSONB := '[]'::jsonb;
BEGIN
  -- Check if bonding is required
  IF p_contract_value >= bond_threshold THEN
    result := jsonb_set(result, '{bonds_required}', 'true'::jsonb);
    requirements := requirements || jsonb_build_array(
      jsonb_build_object(
        'type', 'bond',
        'requirement', 'Performance Bond',
        'amount', p_contract_value,
        'percentage', 100,
        'description', 'Performance bond required for contracts over $35,000'
      ),
      jsonb_build_object(
        'type', 'bond',
        'requirement', 'Payment Bond',
        'amount', p_contract_value,
        'percentage', 100,
        'description', 'Payment bond required for contracts over $35,000'
      )
    );
  END IF;
  
  -- Check if enhanced insurance is required
  IF p_contract_value >= insurance_threshold THEN
    result := jsonb_set(result, '{insurance_required}', 'true'::jsonb);
    requirements := requirements || jsonb_build_array(
      jsonb_build_object(
        'type', 'insurance',
        'requirement', 'General Liability',
        'minimum_coverage', 1000000,
        'aggregate', 2000000,
        'description', 'Enhanced general liability coverage required for contracts over $35,000'
      ),
      jsonb_build_object(
        'type', 'insurance',
        'requirement', 'Workers Compensation',
        'minimum_coverage', 1000000,
        'description', 'Workers compensation insurance required for contracts over $35,000'
      )
    );
  END IF;
  
  result := jsonb_set(result, '{requirements}', requirements);
  
  RETURN result;
END;
$$;