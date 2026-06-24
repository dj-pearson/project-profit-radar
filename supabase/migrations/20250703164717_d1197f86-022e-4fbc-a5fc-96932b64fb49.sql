-- Create GDPR compliance tools tables

-- Data subject requests table for managing GDPR rights
CREATE TABLE public.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'access', 'portability', 'rectification', 'erasure', 'restriction', 'objection'
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  subject_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  request_details JSONB,
  verification_method TEXT, -- 'email', 'identity_document', 'security_questions'
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.user_profiles(id),
  status TEXT DEFAULT 'submitted', -- 'submitted', 'in_progress', 'completed', 'rejected', 'cancelled'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  due_date DATE, -- Legal deadline (typically 30 days from verification)
  assigned_to UUID REFERENCES public.user_profiles(id),
  response_data JSONB, -- Data provided in response to access/portability requests
  actions_taken JSONB, -- Record of actions taken for the request
  rejection_reason TEXT,
  internal_notes TEXT,
  communication_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Consent management table for tracking user consents
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  email TEXT, -- For non-users (prospects, etc.)
  consent_type TEXT NOT NULL, -- 'marketing', 'analytics', 'functional', 'performance', 'essential'
  purpose TEXT NOT NULL, -- Specific purpose for data processing
  lawful_basis TEXT NOT NULL, -- 'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'
  consent_given BOOLEAN NOT NULL,
  consent_method TEXT NOT NULL, -- 'explicit_opt_in', 'pre_checked_box', 'implied', 'verbal', 'written'
  consent_source TEXT, -- 'website_form', 'email_campaign', 'phone_call', 'contract_signing'
  consent_version TEXT, -- Version of privacy policy/consent form
  ip_address INET,
  user_agent TEXT,
  withdrawal_date TIMESTAMPTZ,
  withdrawal_method TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data retention policies table
CREATE TABLE public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_category TEXT NOT NULL, -- 'user_profiles', 'financial_records', 'project_data', 'communication_logs'
  description TEXT NOT NULL,
  retention_period_months INTEGER NOT NULL,
  legal_basis TEXT NOT NULL,
  deletion_criteria JSONB, -- Conditions for deletion
  exceptions JSONB, -- Legal hold exceptions
  is_active BOOLEAN DEFAULT true,
  review_date DATE, -- Next policy review date
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  approved_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data processing activities register (GDPR Article 30)
CREATE TABLE public.processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  controller_details JSONB NOT NULL, -- Company acting as data controller
  processor_details JSONB, -- External processors (if any)
  data_subjects_categories TEXT[] NOT NULL, -- 'employees', 'customers', 'prospects', 'suppliers'
  personal_data_categories TEXT[] NOT NULL, -- 'identification', 'financial', 'location', 'health'
  special_categories TEXT[], -- Sensitive data categories
  purposes TEXT[] NOT NULL, -- Purposes of processing
  lawful_basis TEXT[] NOT NULL,
  recipients JSONB, -- Third parties who receive the data
  third_country_transfers JSONB, -- International transfers
  retention_schedule TEXT NOT NULL,
  security_measures JSONB NOT NULL,
  risk_assessment JSONB,
  dpia_required BOOLEAN DEFAULT false, -- Data Protection Impact Assessment
  dpia_reference TEXT,
  is_active BOOLEAN DEFAULT true,
  last_reviewed DATE,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Privacy impact assessments table
CREATE TABLE public.privacy_impact_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  processing_activity_id UUID REFERENCES public.processing_activities(id),
  assessment_name TEXT NOT NULL,
  description TEXT NOT NULL,
  necessity_justification TEXT NOT NULL,
  proportionality_assessment TEXT NOT NULL,
  risks_identified JSONB NOT NULL,
  mitigation_measures JSONB NOT NULL,
  residual_risks JSONB,
  consultation_required BOOLEAN DEFAULT false,
  consultation_details TEXT,
  dpo_opinion TEXT, -- Data Protection Officer opinion
  status TEXT DEFAULT 'draft', -- 'draft', 'review', 'approved', 'implemented'
  conducted_by UUID NOT NULL REFERENCES public.user_profiles(id),
  reviewed_by UUID REFERENCES public.user_profiles(id),
  approved_by UUID REFERENCES public.user_profiles(id),
  review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_impact_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_subject_requests
CREATE POLICY "Root admins can manage all data subject requests" 
ON public.data_subject_requests FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage company data subject requests" 
ON public.data_subject_requests FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

-- RLS Policies for consent_records
CREATE POLICY "Root admins can view all consent records" 
ON public.consent_records FOR SELECT 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage company consent records" 
ON public.consent_records FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

CREATE POLICY "Users can view their own consent records" 
ON public.consent_records FOR SELECT 
USING (user_id = auth.uid());

-- RLS Policies for data_retention_policies
CREATE POLICY "Root admins can manage all retention policies" 
ON public.data_retention_policies FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage company retention policies" 
ON public.data_retention_policies FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

-- RLS Policies for processing_activities
CREATE POLICY "Root admins can manage all processing activities" 
ON public.processing_activities FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage company processing activities" 
ON public.processing_activities FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

-- RLS Policies for privacy_impact_assessments
CREATE POLICY "Root admins can manage all privacy assessments" 
ON public.privacy_impact_assessments FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage company privacy assessments" 
ON public.privacy_impact_assessments FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

-- Create indexes for better performance
CREATE INDEX idx_data_subject_requests_company_status ON public.data_subject_requests(company_id, status);
CREATE INDEX idx_data_subject_requests_due_date ON public.data_subject_requests(due_date) WHERE status NOT IN ('completed', 'rejected', 'cancelled');
CREATE INDEX idx_consent_records_user_type ON public.consent_records(user_id, consent_type);
CREATE INDEX idx_consent_records_email_type ON public.consent_records(email, consent_type) WHERE user_id IS NULL;
CREATE INDEX idx_retention_policies_company ON public.data_retention_policies(company_id) WHERE is_active = true;
CREATE INDEX idx_processing_activities_company ON public.processing_activities(company_id) WHERE is_active = true;

-- Create triggers for updating updated_at timestamps
CREATE TRIGGER update_data_subject_requests_updated_at
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processing_activities_updated_at
  BEFORE UPDATE ON public.processing_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_privacy_impact_assessments_updated_at
  BEFORE UPDATE ON public.privacy_impact_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle data subject request due dates
CREATE OR REPLACE FUNCTION public.set_request_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Set due date to 30 days from verification (GDPR requirement)
  IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
    NEW.due_date := (NEW.verified_at::date + INTERVAL '30 days')::date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_data_subject_request_due_date
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_request_due_date();

-- Create function to automatically log consent withdrawals
CREATE OR REPLACE FUNCTION public.log_consent_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  -- Log withdrawal in audit trail when consent is withdrawn
  IF NEW.consent_given = false AND OLD.consent_given = true THEN
    NEW.withdrawal_date := now();
    
    -- Log audit event for compliance
    PERFORM public.log_audit_event(
      NEW.company_id,
      COALESCE(NEW.user_id, auth.uid()),
      'update',
      'consent',
      NEW.id::text,
      NEW.consent_type || ' consent withdrawn',
      to_jsonb(OLD),
      to_jsonb(NEW),
      null, -- ip_address
      null, -- user_agent
      null, -- session_id
      'medium',
      'data_protection',
      'User withdrew consent for ' || NEW.purpose,
      jsonb_build_object('consent_type', NEW.consent_type, 'purpose', NEW.purpose)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_consent_withdrawal_trigger
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_consent_withdrawal();