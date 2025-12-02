-- =========================================
-- BUILDDESK CRM SYSTEM - CONSTRUCTION FOCUSED
-- =========================================
-- This migration creates a comprehensive CRM system tailored for construction companies
-- Based on the requirements in CRM.md and industry best practices

-- Lead Sources for construction industry
CREATE TYPE public.lead_source AS ENUM (
  'referral',
  'website',
  'social_media',
  'trade_show',
  'cold_call',
  'email_campaign',
  'google_ads',
  'direct_mail',
  'networking',
  'repeat_client',
  'subcontractor_referral',
  'supplier_referral',
  'other'
);

-- Lead status tracking
CREATE TYPE public.lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'follow_up',
  'negotiating',
  'won',
  'lost',
  'on_hold'
);

-- Construction project types
CREATE TYPE public.project_type AS ENUM (
  'residential_new',
  'residential_renovation',
  'commercial_new',
  'commercial_renovation',
  'industrial',
  'infrastructure',
  'specialty_trade',
  'maintenance',
  'emergency_repair',
  'tenant_improvement'
);

-- Construction CRM priority levels
CREATE TYPE public.crm_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Activity types for CRM tracking
CREATE TYPE public.activity_type AS ENUM (
  'call',
  'email',
  'meeting',
  'site_visit',
  'proposal',
  'follow_up',
  'contract_signing',
  'project_kickoff',
  'other'
);

-- =========================================
-- LEADS TABLE - Core lead management
-- =========================================
CREATE TABLE public.leads (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Basic Lead Information
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  company_name text,
  job_title text,
  
  -- Project Information (Construction Specific)
  project_name text,
  project_type public.project_type,
  project_description text,
  project_address text,
  project_city text,
  project_state text,
  project_zip text,
  
  -- Financial Information
  estimated_budget decimal(12,2),
  budget_range text, -- e.g., "$10K-$50K", "$50K-$100K", etc.
  
  -- Timeline Information
  desired_start_date date,
  desired_completion_date date,
  timeline_flexibility text, -- 'flexible', 'somewhat_flexible', 'fixed'
  
  -- Lead Tracking
  lead_source public.lead_source NOT NULL DEFAULT 'other',
  lead_source_detail text, -- Additional details about source
  status public.lead_status NOT NULL DEFAULT 'new',
  priority public.crm_priority NOT NULL DEFAULT 'medium',
  
  -- Assignment and Ownership
  assigned_to uuid REFERENCES public.user_profiles(id),
  created_by uuid REFERENCES public.user_profiles(id),
  
  -- Construction Specific Fields
  property_type text, -- 'single_family', 'multi_family', 'commercial', 'industrial'
  permits_required boolean DEFAULT false,
  hoa_approval_needed boolean DEFAULT false,
  financing_secured boolean DEFAULT false,
  financing_type text, -- 'cash', 'construction_loan', 'home_equity', 'other'
  
  -- Site Information
  site_accessible boolean DEFAULT true,
  site_conditions text, -- 'good', 'challenging', 'requires_assessment'
  existing_structures text,
  utilities_available text,
  
  -- Qualification Information
  decision_maker boolean DEFAULT false,
  decision_timeline text, -- 'immediate', '1-3_months', '3-6_months', '6_months_plus'
  competition_known text,
  previous_contractor text,
  
  -- Follow-up Information
  next_follow_up_date date,
  last_contact_date date,
  contact_attempts integer DEFAULT 0,
  
  -- Notes and Additional Info
  notes text,
  tags text[], -- Array of tags for categorization
  
  -- Audit Fields
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT leads_email_company_unique UNIQUE (email, company_id),
  CONSTRAINT leads_budget_positive CHECK (estimated_budget > 0 OR estimated_budget IS NULL)
);

-- =========================================
-- CONTACTS TABLE - Relationship management
-- =========================================
CREATE TABLE public.contacts (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Basic Contact Information
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  mobile_phone text,
  
  -- Company Information
  company_name text,
  job_title text,
  department text,
  
  -- Address Information
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'United States',
  
  -- Contact Preferences
  preferred_contact_method text DEFAULT 'email', -- 'email', 'phone', 'text', 'mail'
  best_contact_time text, -- 'morning', 'afternoon', 'evening', 'weekends'
  
  -- Relationship Information
  contact_type text DEFAULT 'prospect', -- 'prospect', 'client', 'vendor', 'subcontractor', 'supplier', 'architect', 'engineer'
  relationship_status text DEFAULT 'active', -- 'active', 'inactive', 'do_not_contact'
  
  -- Construction Specific
  trade_specialties text[], -- Array of trade specialties if applicable
  license_number text,
  insurance_info text,
  bonding_capacity decimal(12,2),
  
  -- Assignment and Ownership
  assigned_to uuid REFERENCES public.user_profiles(id),
  created_by uuid REFERENCES public.user_profiles(id),
  
  -- Notes and Tags
  notes text,
  tags text[],
  
  -- Audit Fields
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT contacts_email_company_unique UNIQUE (email, company_id)
);

-- =========================================
-- OPPORTUNITIES TABLE - Sales pipeline
-- =========================================
CREATE TABLE public.opportunities (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Opportunity Basic Info
  name text NOT NULL,
  description text,
  
  -- Related Records
  lead_id uuid REFERENCES public.leads(id),
  contact_id uuid REFERENCES public.contacts(id),
  project_id uuid REFERENCES public.projects(id), -- Link to project if won
  
  -- Financial Information
  estimated_value decimal(12,2) NOT NULL,
  probability_percent integer DEFAULT 50,
  expected_close_date date,
  
  -- Pipeline Information
  stage text NOT NULL DEFAULT 'prospecting', -- 'prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  pipeline_position integer DEFAULT 1,
  
  -- Construction Specific
  project_type public.project_type,
  bid_required boolean DEFAULT false,
  bid_due_date date,
  proposal_sent_date date,
  contract_signed_date date,
  
  -- Competition and Market
  competitor_names text[],
  our_competitive_advantage text,
  key_decision_factors text[],
  
  -- Team Assignment
  account_manager uuid REFERENCES public.user_profiles(id),
  estimator uuid REFERENCES public.user_profiles(id),
  project_manager uuid REFERENCES public.user_profiles(id),
  
  -- Risk Assessment
  risk_level public.crm_priority DEFAULT 'medium',
  risk_factors text[],
  mitigation_strategies text,
  
  -- Outcome Tracking
  close_date date,
  close_reason text,
  actual_value decimal(12,2),
  
  -- Notes and Tags
  notes text,
  tags text[],
  
  -- Audit Fields
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT opportunities_probability_range CHECK (probability_percent >= 0 AND probability_percent <= 100),
  CONSTRAINT opportunities_values_positive CHECK (estimated_value > 0 AND (actual_value > 0 OR actual_value IS NULL))
);

-- =========================================
-- ACTIVITIES TABLE - Interaction tracking
-- =========================================
CREATE TABLE public.activities (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Activity Basic Info
  subject text NOT NULL,
  description text,
  activity_type public.activity_type NOT NULL DEFAULT 'other',
  
  -- Related Records (flexible relationship)
  lead_id uuid REFERENCES public.leads(id),
  contact_id uuid REFERENCES public.contacts(id),
  opportunity_id uuid REFERENCES public.opportunities(id),
  
  -- Timing
  scheduled_date timestamp with time zone,
  completed_date timestamp with time zone,
  duration_minutes integer,
  
  -- Status and Priority
  status text DEFAULT 'pending', -- 'pending', 'completed', 'cancelled', 'no_show'
  priority public.crm_priority DEFAULT 'medium',
  
  -- Assignment
  assigned_to uuid REFERENCES public.user_profiles(id),
  created_by uuid REFERENCES public.user_profiles(id),
  
  -- Outcome
  outcome text,
  follow_up_required boolean DEFAULT false,
  next_follow_up_date date,
  
  -- Notes and Attachments
  notes text,
  attachments text[], -- Array of file paths/URLs
  
  -- Audit Fields
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =========================================
-- LEAD_CONTACT_RELATIONSHIPS - Many-to-many
-- =========================================
CREATE TABLE public.lead_contact_relationships (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'primary', -- 'primary', 'decision_maker', 'influencer', 'end_user', 'architect', 'engineer'
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT lead_contact_unique UNIQUE (lead_id, contact_id)
);

-- =========================================
-- SALES_TARGETS - Performance tracking
-- =========================================
CREATE TABLE public.sales_targets (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Target Information
  sales_person uuid NOT NULL REFERENCES public.user_profiles(id),
  target_period text NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  target_year integer NOT NULL,
  target_quarter integer, -- 1, 2, 3, 4 (for quarterly targets)
  target_month integer, -- 1-12 (for monthly targets)
  
  -- Financial Targets
  revenue_target decimal(12,2) NOT NULL,
  leads_target integer DEFAULT 0,
  opportunities_target integer DEFAULT 0,
  conversion_rate_target decimal(5,2) DEFAULT 0.00,
  
  -- Actual Performance (calculated)
  actual_revenue decimal(12,2) DEFAULT 0.00,
  actual_leads integer DEFAULT 0,
  actual_opportunities integer DEFAULT 0,
  actual_conversion_rate decimal(5,2) DEFAULT 0.00,
  
  -- Audit Fields
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT sales_targets_unique UNIQUE (sales_person, target_period, target_year, target_quarter, target_month),
  CONSTRAINT sales_targets_positive CHECK (revenue_target > 0)
);

-- =========================================
-- INDEXES for performance optimization
-- =========================================

-- Leads indexes
CREATE INDEX idx_leads_company_id ON public.leads(company_id);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_source ON public.leads(lead_source);
CREATE INDEX idx_leads_follow_up ON public.leads(next_follow_up_date);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);

-- Contacts indexes
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_assigned_to ON public.contacts(assigned_to);
CREATE INDEX idx_contacts_type ON public.contacts(contact_type);
CREATE INDEX idx_contacts_email ON public.contacts(email);

-- Opportunities indexes
CREATE INDEX idx_opportunities_company_id ON public.opportunities(company_id);
CREATE INDEX idx_opportunities_account_manager ON public.opportunities(account_manager);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunities_close_date ON public.opportunities(expected_close_date);
CREATE INDEX idx_opportunities_value ON public.opportunities(estimated_value);

-- Activities indexes
CREATE INDEX idx_activities_company_id ON public.activities(company_id);
CREATE INDEX idx_activities_assigned_to ON public.activities(assigned_to);
CREATE INDEX idx_activities_scheduled_date ON public.activities(scheduled_date);
CREATE INDEX idx_activities_status ON public.activities(status);

-- =========================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contact_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company ID (assuming this exists)
-- If not, we'll need to create it
CREATE OR REPLACE FUNCTION get_user_company_id(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT company_id FROM public.user_profiles WHERE id = user_id);
END;
$$;

-- Helper function to get user's role (assuming this exists)
-- If not, we'll need to create it
CREATE OR REPLACE FUNCTION get_user_role_type(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT role::text FROM public.user_profiles WHERE id = user_id);
END;
$$;

-- =========================================
-- LEADS RLS POLICIES
-- =========================================

-- Select: Users can view leads from their company
CREATE POLICY "Users can view company leads"
ON public.leads
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

-- Insert: Authorized users can create leads
CREATE POLICY "Authorized users can create leads"
ON public.leads
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
);

-- Update: Users can update leads assigned to them or if they have proper role
CREATE POLICY "Users can update assigned leads"
ON public.leads
FOR UPDATE
USING (
  (company_id = get_user_company_id(auth.uid()) AND assigned_to = auth.uid()) OR
  (company_id = get_user_company_id(auth.uid()) AND get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'root_admin']))
);

-- Delete: Only admins can delete leads
CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'root_admin'])
);

-- =========================================
-- CONTACTS RLS POLICIES
-- =========================================

-- Select: Users can view contacts from their company
CREATE POLICY "Users can view company contacts"
ON public.contacts
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

-- Insert: Authorized users can create contacts
CREATE POLICY "Authorized users can create contacts"
ON public.contacts
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
);

-- Update: Users can update contacts assigned to them or if they have proper role
CREATE POLICY "Users can update assigned contacts"
ON public.contacts
FOR UPDATE
USING (
  (company_id = get_user_company_id(auth.uid()) AND assigned_to = auth.uid()) OR
  (company_id = get_user_company_id(auth.uid()) AND get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'root_admin']))
);

-- Delete: Only admins can delete contacts
CREATE POLICY "Admins can delete contacts"
ON public.contacts
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'root_admin'])
);

-- =========================================
-- OPPORTUNITIES RLS POLICIES
-- =========================================

-- Select: Users can view opportunities from their company
CREATE POLICY "Users can view company opportunities"
ON public.opportunities
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

-- Insert: Authorized users can create opportunities
CREATE POLICY "Authorized users can create opportunities"
ON public.opportunities
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
);

-- Update: Account managers and authorized users can update opportunities
CREATE POLICY "Account managers can update opportunities"
ON public.opportunities
FOR UPDATE
USING (
  (company_id = get_user_company_id(auth.uid()) AND account_manager = auth.uid()) OR
  (company_id = get_user_company_id(auth.uid()) AND get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'root_admin']))
);

-- Delete: Only admins can delete opportunities
CREATE POLICY "Admins can delete opportunities"
ON public.opportunities
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'root_admin'])
);

-- =========================================
-- ACTIVITIES RLS POLICIES
-- =========================================

-- Select: Users can view activities from their company
CREATE POLICY "Users can view company activities"
ON public.activities
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

-- Insert: Authorized users can create activities
CREATE POLICY "Authorized users can create activities"
ON public.activities
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'office_staff', 'field_supervisor', 'root_admin'])
);

-- Update: Users can update activities assigned to them or if they have proper role
CREATE POLICY "Users can update assigned activities"
ON public.activities
FOR UPDATE
USING (
  (company_id = get_user_company_id(auth.uid()) AND assigned_to = auth.uid()) OR
  (company_id = get_user_company_id(auth.uid()) AND get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'root_admin']))
);

-- Delete: Users can delete their own activities or admins can delete any
CREATE POLICY "Users can delete assigned activities"
ON public.activities
FOR DELETE
USING (
  (company_id = get_user_company_id(auth.uid()) AND assigned_to = auth.uid()) OR
  (company_id = get_user_company_id(auth.uid()) AND get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'root_admin']))
);

-- =========================================
-- LEAD_CONTACT_RELATIONSHIPS RLS POLICIES
-- =========================================

-- Select: Users can view relationships from their company
CREATE POLICY "Users can view company lead relationships"
ON public.lead_contact_relationships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND l.company_id = get_user_company_id(auth.uid())
  ) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

-- Insert: Authorized users can create relationships
CREATE POLICY "Authorized users can create lead relationships"
ON public.lead_contact_relationships
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND l.company_id = get_user_company_id(auth.uid())
  ) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
);

-- Update: Authorized users can update relationships
CREATE POLICY "Authorized users can update lead relationships"
ON public.lead_contact_relationships
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND l.company_id = get_user_company_id(auth.uid())
  ) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
);

-- Delete: Authorized users can delete relationships
CREATE POLICY "Authorized users can delete lead relationships"
ON public.lead_contact_relationships
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND l.company_id = get_user_company_id(auth.uid())
  ) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
);

-- =========================================
-- SALES_TARGETS RLS POLICIES
-- =========================================

-- Select: Users can view targets from their company
CREATE POLICY "Users can view company sales targets"
ON public.sales_targets
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

-- Insert: Only admins can create sales targets
CREATE POLICY "Admins can create sales targets"
ON public.sales_targets
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'root_admin'])
);

-- Update: Only admins can update sales targets
CREATE POLICY "Admins can update sales targets"
ON public.sales_targets
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'root_admin'])
);

-- Delete: Only admins can delete sales targets
CREATE POLICY "Admins can delete sales targets"
ON public.sales_targets
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'root_admin'])
);

-- =========================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =========================================

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_targets_updated_at BEFORE UPDATE ON public.sales_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- COMMENTS FOR DOCUMENTATION
-- =========================================

COMMENT ON TABLE public.leads IS 'Construction-focused lead management with project-specific fields';
COMMENT ON TABLE public.contacts IS 'Comprehensive contact management for construction industry relationships';
COMMENT ON TABLE public.opportunities IS 'Sales pipeline tracking with construction-specific workflow stages';
COMMENT ON TABLE public.activities IS 'Activity tracking for all CRM interactions and follow-ups';
COMMENT ON TABLE public.lead_contact_relationships IS 'Many-to-many relationship tracking between leads and contacts';
COMMENT ON TABLE public.sales_targets IS 'Performance tracking and goal setting for sales team members';

-- =========================================
-- INITIAL DATA SETUP
-- =========================================

-- This migration creates the structure. Initial data would be handled separately
-- or through the application interface.

-- Migration completed successfully