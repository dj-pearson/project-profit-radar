-- Create lead tracking and qualification system
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  lead_source TEXT NOT NULL, -- website, referral, social_media, cold_call, etc.
  lead_type TEXT NOT NULL CHECK (lead_type IN ('residential', 'commercial', 'specialty_trade', 'mixed')),
  contact_method TEXT CHECK (contact_method IN ('phone', 'email', 'form', 'in_person', 'social_media')),
  
  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Project Details
  project_title TEXT,
  project_description TEXT,
  project_type TEXT, -- renovation, new_construction, repair, etc.
  estimated_budget NUMERIC,
  budget_range TEXT, -- <10k, 10k-25k, 25k-50k, 50k-100k, 100k+
  project_timeline TEXT, -- immediate, 1-3_months, 3-6_months, 6-12_months, 12+_months
  project_location TEXT,
  square_footage INTEGER,
  
  -- Lead Qualification
  decision_maker BOOLEAN DEFAULT false,
  financing_secured BOOLEAN DEFAULT false,
  timeline_confirmed BOOLEAN DEFAULT false,
  budget_qualified BOOLEAN DEFAULT false,
  permits_required BOOLEAN,
  
  -- Lead Scoring & Status
  lead_score INTEGER DEFAULT 0,
  lead_status TEXT NOT NULL DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost', 'on_hold')),
  lead_priority TEXT DEFAULT 'medium' CHECK (lead_priority IN ('low', 'medium', 'high', 'urgent')),
  lead_quality TEXT DEFAULT 'unqualified' CHECK (lead_quality IN ('unqualified', 'marketing_qualified', 'sales_qualified', 'opportunity')),
  
  -- Assignment & Follow-up
  assigned_to UUID REFERENCES auth.users(id),
  next_follow_up DATE,
  last_contact_date DATE,
  follow_up_method TEXT,
  
  -- Competition & Market Info
  competitor_mentioned TEXT,
  price_sensitivity TEXT CHECK (price_sensitivity IN ('low', 'medium', 'high')),
  referral_source TEXT,
  
  -- Conversion Tracking
  converted_to_project BOOLEAN DEFAULT false,
  project_id UUID REFERENCES public.projects(id),
  conversion_date DATE,
  conversion_value NUMERIC,
  
  -- Loss Analysis
  loss_reason TEXT,
  loss_category TEXT CHECK (loss_category IN ('price', 'timeline', 'scope', 'competitor', 'no_response', 'not_qualified', 'other')),
  competitor_won TEXT,
  
  -- Tags and Notes
  tags TEXT[],
  internal_notes TEXT,
  
  -- Timestamps
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead activities/interactions table
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'site_visit', 'proposal', 'follow_up', 'quote', 'contract', 'note')),
  activity_subject TEXT,
  activity_description TEXT,
  outcome TEXT,
  next_action TEXT,
  next_action_date DATE,
  
  -- Contact Details
  contact_method TEXT,
  duration_minutes INTEGER,
  attendees TEXT[],
  
  -- Document Attachments
  document_urls TEXT[],
  
  -- User tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead scoring rules table
CREATE TABLE public.lead_scoring_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  rule_name TEXT NOT NULL,
  rule_category TEXT NOT NULL CHECK (rule_category IN ('demographic', 'behavioral', 'engagement', 'project_fit', 'timeline', 'budget')),
  condition_field TEXT NOT NULL, -- field to evaluate
  condition_operator TEXT NOT NULL CHECK (condition_operator IN ('equals', 'greater_than', 'less_than', 'contains', 'not_empty', 'in_range')),
  condition_value TEXT, -- value to compare against
  score_points INTEGER NOT NULL DEFAULT 0, -- points to add/subtract
  is_active BOOLEAN DEFAULT true,
  
  -- System vs custom rules
  is_system_rule BOOLEAN DEFAULT false,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead qualification templates
CREATE TABLE public.lead_qualification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  template_name TEXT NOT NULL,
  lead_type TEXT NOT NULL, -- residential, commercial, specialty_trade
  qualification_criteria JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of qualification questions/criteria
  disqualification_criteria JSONB DEFAULT '[]'::jsonb,
  scoring_weights JSONB DEFAULT '{}'::jsonb, -- Weight factors for different criteria
  minimum_score_threshold INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  is_system_template BOOLEAN DEFAULT false,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead behavioral tracking
CREATE TABLE public.lead_behavioral_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  
  -- Website/Digital Engagement
  website_visits INTEGER DEFAULT 0,
  pages_viewed INTEGER DEFAULT 0,
  time_on_site_minutes INTEGER DEFAULT 0,
  blog_posts_read INTEGER DEFAULT 0,
  case_studies_viewed INTEGER DEFAULT 0,
  pricing_page_visits INTEGER DEFAULT 0,
  contact_form_submissions INTEGER DEFAULT 0,
  
  -- Email Engagement
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  document_downloads INTEGER DEFAULT 0,
  
  -- Social Media
  social_media_interactions INTEGER DEFAULT 0,
  
  -- Communication Engagement
  phone_calls_answered INTEGER DEFAULT 0,
  phone_calls_missed INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  meetings_attended INTEGER DEFAULT 0,
  
  -- Engagement Score
  engagement_score INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_leads_company_id ON public.leads(company_id);
CREATE INDEX idx_leads_status ON public.leads(lead_status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_score ON public.leads(lead_score DESC);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_next_followup ON public.leads(next_follow_up);

CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

CREATE INDEX idx_lead_scoring_rules_company ON public.lead_scoring_rules(company_id);
CREATE INDEX idx_lead_qualification_templates_company ON public.lead_qualification_templates(company_id);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_qualification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_behavioral_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Users can view company leads" ON public.leads
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Staff can manage company leads" ON public.leads
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
  );

-- RLS Policies for lead_activities
CREATE POLICY "Users can view company lead activities" ON public.lead_activities
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Staff can manage company lead activities" ON public.lead_activities
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
  );

-- RLS Policies for lead_scoring_rules
CREATE POLICY "Users can view system and company scoring rules" ON public.lead_scoring_rules
  FOR SELECT USING (
    is_system_rule = true OR 
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Staff can manage company scoring rules" ON public.lead_scoring_rules
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']::user_role[])
  );

-- RLS Policies for lead_qualification_templates
CREATE POLICY "Users can view system and company qualification templates" ON public.lead_qualification_templates
  FOR SELECT USING (
    is_system_template = true OR 
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Staff can manage company qualification templates" ON public.lead_qualification_templates
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']::user_role[])
  );

-- RLS Policies for lead_behavioral_data
CREATE POLICY "Users can view company lead behavioral data" ON public.lead_behavioral_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_behavioral_data.lead_id 
      AND (leads.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

CREATE POLICY "Staff can manage company lead behavioral data" ON public.lead_behavioral_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_behavioral_data.lead_id 
      AND leads.company_id = get_user_company(auth.uid())
      AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_scoring_rules_updated_at
  BEFORE UPDATE ON public.lead_scoring_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_qualification_templates_updated_at
  BEFORE UPDATE ON public.lead_qualification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_behavioral_data_updated_at
  BEFORE UPDATE ON public.lead_behavioral_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default lead scoring rules
INSERT INTO public.lead_scoring_rules (
  rule_name, rule_category, condition_field, condition_operator, 
  condition_value, score_points, is_system_rule
) VALUES 
('High Budget Projects', 'budget', 'estimated_budget', 'greater_than', '50000', 25, true),
('Medium Budget Projects', 'budget', 'estimated_budget', 'greater_than', '25000', 15, true),
('Decision Maker', 'demographic', 'decision_maker', 'equals', 'true', 20, true),
('Financing Secured', 'demographic', 'financing_secured', 'equals', 'true', 15, true),
('Immediate Timeline', 'timeline', 'project_timeline', 'equals', 'immediate', 20, true),
('Short Timeline', 'timeline', 'project_timeline', 'equals', '1-3_months', 15, true),
('Phone Number Provided', 'engagement', 'phone', 'not_empty', '', 10, true),
('Company Project', 'demographic', 'company_name', 'not_empty', '', 10, true),
('Referral Lead', 'demographic', 'lead_source', 'equals', 'referral', 15, true),
('Multiple Contact Methods', 'engagement', 'contact_method', 'not_empty', '', 5, true);

-- Insert default qualification templates
INSERT INTO public.lead_qualification_templates (
  template_name, lead_type, qualification_criteria, disqualification_criteria, 
  scoring_weights, minimum_score_threshold, is_system_template
) VALUES 
(
  'Residential Construction Qualification',
  'residential',
  '[
    {"question": "Is the prospect the homeowner or decision maker?", "weight": 25, "required": true},
    {"question": "Is the budget above $10,000?", "weight": 20, "required": true},
    {"question": "Is the timeline within 12 months?", "weight": 15, "required": false},
    {"question": "Is financing secured or pre-approved?", "weight": 15, "required": false},
    {"question": "Is the property location within service area?", "weight": 10, "required": true},
    {"question": "Does the prospect understand permit requirements?", "weight": 10, "required": false},
    {"question": "Has the prospect contacted other contractors?", "weight": 5, "required": false}
  ]'::jsonb,
  '[
    {"condition": "Budget below $5,000", "reason": "Below minimum project size"},
    {"condition": "Timeline beyond 24 months", "reason": "Timeline too far out"},
    {"condition": "Outside service area", "reason": "Geographic limitations"}
  ]'::jsonb,
  '{"budget": 25, "timeline": 20, "authority": 25, "need": 15, "location": 15}'::jsonb,
  65,
  true
),
(
  'Commercial Construction Qualification',
  'commercial',
  '[
    {"question": "Is the prospect the decision maker or influencer?", "weight": 20, "required": true},
    {"question": "Is the budget above $50,000?", "weight": 25, "required": true},
    {"question": "Is the timeline realistic and confirmed?", "weight": 15, "required": true},
    {"question": "Are permits and approvals understood?", "weight": 10, "required": false},
    {"question": "Is this a competitive bid situation?", "weight": 10, "required": false},
    {"question": "Does the company have a track record of completing projects?", "weight": 10, "required": false},
    {"question": "Is financing/funding secured?", "weight": 10, "required": false}
  ]'::jsonb,
  '[
    {"condition": "Budget below $25,000", "reason": "Below minimum commercial project size"},
    {"condition": "No decision making authority", "reason": "Cannot move forward without decision maker"},
    {"condition": "Unrealistic timeline expectations", "reason": "Project timeline not feasible"}
  ]'::jsonb,
  '{"budget": 30, "timeline": 20, "authority": 25, "need": 15, "financing": 10}'::jsonb,
  70,
  true
);