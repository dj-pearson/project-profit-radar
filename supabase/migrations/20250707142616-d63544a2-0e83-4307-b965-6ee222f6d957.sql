-- Create environmental permitting system tables
CREATE TABLE public.environmental_permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Permit identification
  permit_number TEXT NOT NULL,
  permit_name TEXT NOT NULL,
  permit_type TEXT NOT NULL CHECK (permit_type IN ('air_quality', 'water_discharge', 'storm_water', 'wetlands', 'endangered_species', 'cultural_resources', 'noise', 'waste_management', 'hazardous_materials', 'nepa_assessment', 'other')),
  
  -- Regulatory agency
  issuing_agency TEXT NOT NULL CHECK (issuing_agency IN ('epa', 'state_epa', 'army_corps', 'usfws', 'noaa', 'state_wildlife', 'local_authority', 'tribal_authority', 'other')),
  agency_contact_name TEXT,
  agency_contact_email TEXT,
  agency_contact_phone TEXT,
  
  -- Permit details
  description TEXT,
  regulatory_framework TEXT, -- CFR reference, state code, etc.
  permit_conditions JSONB DEFAULT '[]'::jsonb,
  monitoring_requirements JSONB DEFAULT '[]'::jsonb,
  reporting_requirements JSONB DEFAULT '[]'::jsonb,
  
  -- NEPA specific fields
  nepa_category TEXT CHECK (nepa_category IN ('categorical_exclusion', 'environmental_assessment', 'environmental_impact_statement', 'not_applicable')),
  nepa_document_type TEXT,
  nepa_class_of_action TEXT,
  
  -- Status and dates
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'conditional_approval', 'denied', 'expired', 'suspended', 'renewed')),
  application_date DATE,
  review_start_date DATE,
  target_decision_date DATE,
  decision_date DATE,
  effective_date DATE,
  expiration_date DATE,
  
  -- Financial
  application_fee NUMERIC(10,2) DEFAULT 0,
  annual_fee NUMERIC(10,2) DEFAULT 0,
  compliance_bond_amount NUMERIC(12,2) DEFAULT 0,
  
  -- Documents and compliance
  application_document_path TEXT,
  permit_document_path TEXT,
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Compliance tracking
  last_inspection_date DATE,
  next_inspection_date DATE,
  compliance_status TEXT DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'minor_violation', 'major_violation', 'pending_review', 'unknown')),
  violations JSONB DEFAULT '[]'::jsonb,
  
  -- Renewal tracking
  renewal_required BOOLEAN DEFAULT false,
  renewal_notice_date DATE,
  renewal_application_deadline DATE,
  
  -- Public participation (for NEPA)
  public_comment_period_start DATE,
  public_comment_period_end DATE,
  public_hearing_scheduled BOOLEAN DEFAULT false,
  public_hearing_date DATE,
  
  -- Environmental impact
  environmental_impact_summary TEXT,
  mitigation_measures JSONB DEFAULT '[]'::jsonb,
  monitoring_plan TEXT,
  
  -- Coordination
  tribal_consultation_required BOOLEAN DEFAULT false,
  tribal_consultation_status TEXT,
  interagency_coordination JSONB DEFAULT '[]'::jsonb,
  
  -- Internal tracking
  assigned_to UUID REFERENCES public.user_profiles(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  internal_notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create environmental assessments table for NEPA documentation
CREATE TABLE public.environmental_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.environmental_permits(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Assessment details
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('environmental_assessment', 'environmental_impact_statement', 'categorical_exclusion', 'supplemental_analysis')),
  lead_agency TEXT NOT NULL,
  cooperating_agencies TEXT[],
  
  -- NEPA process
  nepa_process_stage TEXT DEFAULT 'initiation' CHECK (nepa_process_stage IN ('initiation', 'scoping', 'analysis', 'draft_document', 'public_review', 'final_document', 'record_of_decision', 'monitoring')),
  scoping_period_start DATE,
  scoping_period_end DATE,
  
  -- Environmental factors assessed
  air_quality_impact TEXT,
  water_quality_impact TEXT,
  soil_impact TEXT,
  vegetation_impact TEXT,
  wildlife_impact TEXT,
  cultural_resources_impact TEXT,
  socioeconomic_impact TEXT,
  noise_impact TEXT,
  visual_impact TEXT,
  cumulative_impact TEXT,
  
  -- Alternatives analysis
  purpose_and_need TEXT,
  alternatives_considered JSONB DEFAULT '[]'::jsonb,
  preferred_alternative TEXT,
  no_action_alternative TEXT,
  
  -- Mitigation and monitoring
  mitigation_measures JSONB DEFAULT '[]'::jsonb,
  monitoring_commitments JSONB DEFAULT '[]'::jsonb,
  adaptive_management_plan TEXT,
  
  -- Public involvement
  stakeholder_engagement_plan TEXT,
  public_meetings_held JSONB DEFAULT '[]'::jsonb,
  comments_received INTEGER DEFAULT 0,
  comment_response_document_path TEXT,
  
  -- Documentation
  assessment_document_path TEXT,
  supporting_studies JSONB DEFAULT '[]'::jsonb,
  gis_data_path TEXT,
  photos_path TEXT,
  
  -- Decision
  finding TEXT CHECK (finding IN ('finding_of_no_significant_impact', 'significant_impact_requires_eis', 'pending', 'not_applicable')),
  decision_rationale TEXT,
  decision_date DATE,
  
  -- Follow-up
  post_decision_monitoring TEXT,
  adaptive_management_triggers JSONB DEFAULT '[]'::jsonb,
  
  -- Tracking
  prepared_by UUID REFERENCES public.user_profiles(id),
  reviewed_by UUID REFERENCES public.user_profiles(id),
  approved_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit compliance events table
CREATE TABLE public.permit_compliance_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.environmental_permits(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('inspection', 'report_submission', 'violation', 'corrective_action', 'renewal', 'modification', 'monitoring', 'audit')),
  event_date DATE NOT NULL,
  inspector_name TEXT,
  inspector_agency TEXT,
  
  -- Inspection results
  inspection_type TEXT,
  areas_inspected TEXT[],
  findings TEXT,
  compliance_rating TEXT CHECK (compliance_rating IN ('full_compliance', 'minor_issues', 'major_violations', 'significant_violations')),
  
  -- Violations and corrective actions
  violations_found JSONB DEFAULT '[]'::jsonb,
  corrective_actions_required JSONB DEFAULT '[]'::jsonb,
  corrective_action_deadline DATE,
  corrective_actions_completed BOOLEAN DEFAULT false,
  corrective_action_completion_date DATE,
  
  -- Documentation
  inspection_report_path TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'in_progress', 'resolved', 'escalated')),
  
  -- Financial impact
  penalty_amount NUMERIC(10,2) DEFAULT 0,
  fine_paid_date DATE,
  
  -- Internal tracking
  reported_by UUID REFERENCES public.user_profiles(id),
  assigned_to UUID REFERENCES public.user_profiles(id),
  internal_notes TEXT,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create environmental monitoring table
CREATE TABLE public.environmental_monitoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.environmental_permits(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Monitoring details
  monitoring_type TEXT NOT NULL CHECK (monitoring_type IN ('air_quality', 'water_quality', 'noise_levels', 'soil_contamination', 'wildlife_observation', 'vegetation_health', 'groundwater', 'surface_water', 'emissions')),
  parameter_measured TEXT NOT NULL,
  measurement_unit TEXT,
  
  -- Measurement data
  measured_value NUMERIC(15,6),
  permit_limit NUMERIC(15,6),
  regulatory_limit NUMERIC(15,6),
  measurement_method TEXT,
  equipment_used TEXT,
  
  -- Location and timing
  monitoring_location TEXT,
  gps_coordinates POINT,
  measurement_date TIMESTAMP WITH TIME ZONE NOT NULL,
  frequency_required TEXT, -- daily, weekly, monthly, quarterly, etc.
  
  -- Quality assurance
  calibration_date DATE,
  qa_qc_notes TEXT,
  certified_lab BOOLEAN DEFAULT false,
  lab_name TEXT,
  chain_of_custody_number TEXT,
  
  -- Results and compliance
  within_limits BOOLEAN,
  exceedance_level NUMERIC(8,4), -- percentage over limit
  corrective_action_triggered BOOLEAN DEFAULT false,
  
  -- Weather conditions (if relevant)
  weather_conditions TEXT,
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  wind_speed NUMERIC(5,2),
  wind_direction TEXT,
  
  -- Documentation
  data_file_path TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  field_notes TEXT,
  
  -- Tracking
  collected_by UUID REFERENCES public.user_profiles(id),
  verified_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agency coordination table
CREATE TABLE public.agency_coordination (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.environmental_permits(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Agency details
  agency_name TEXT NOT NULL,
  agency_type TEXT CHECK (agency_type IN ('federal', 'state', 'local', 'tribal', 'international')),
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  department_division TEXT,
  
  -- Coordination details
  coordination_type TEXT NOT NULL CHECK (coordination_type IN ('consultation', 'concurrence', 'permit_review', 'technical_assistance', 'enforcement', 'monitoring', 'reporting')),
  subject TEXT NOT NULL,
  description TEXT,
  
  -- Communication tracking
  initial_contact_date DATE,
  last_contact_date DATE,
  response_deadline DATE,
  response_received_date DATE,
  
  -- Status and outcomes
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'in_progress', 'pending_response', 'completed', 'no_response', 'escalated')),
  outcome TEXT,
  agency_position TEXT,
  conditions_or_requirements JSONB DEFAULT '[]'::jsonb,
  
  -- Documentation
  correspondence_log JSONB DEFAULT '[]'::jsonb,
  documents_exchanged JSONB DEFAULT '[]'::jsonb,
  meeting_notes TEXT,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  next_milestone DATE,
  
  -- Tracking
  initiated_by UUID REFERENCES public.user_profiles(id),
  assigned_to UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.environmental_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environmental_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environmental_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_coordination ENABLE ROW LEVEL SECURITY;

-- RLS Policies for environmental permits
CREATE POLICY "Users can view company environmental permits" 
ON public.environmental_permits 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage environmental permits" 
ON public.environmental_permits 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for environmental assessments
CREATE POLICY "Users can view company environmental assessments" 
ON public.environmental_assessments 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage environmental assessments" 
ON public.environmental_assessments 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for permit compliance events
CREATE POLICY "Users can view company compliance events" 
ON public.permit_compliance_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.environmental_permits ep 
    WHERE ep.id = permit_compliance_events.permit_id 
    AND (ep.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage compliance events" 
ON public.permit_compliance_events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.environmental_permits ep 
    WHERE ep.id = permit_compliance_events.permit_id 
    AND ep.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role])
  )
);

-- RLS Policies for environmental monitoring
CREATE POLICY "Users can view company environmental monitoring" 
ON public.environmental_monitoring 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage environmental monitoring" 
ON public.environmental_monitoring 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for agency coordination
CREATE POLICY "Users can view company agency coordination" 
ON public.agency_coordination 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage agency coordination" 
ON public.agency_coordination 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- Add updated_at triggers
CREATE TRIGGER update_environmental_permits_updated_at
  BEFORE UPDATE ON public.environmental_permits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_environmental_assessments_updated_at
  BEFORE UPDATE ON public.environmental_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permit_compliance_events_updated_at
  BEFORE UPDATE ON public.permit_compliance_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_environmental_monitoring_updated_at
  BEFORE UPDATE ON public.environmental_monitoring
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_coordination_updated_at
  BEFORE UPDATE ON public.agency_coordination
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_environmental_permits_company ON public.environmental_permits(company_id);
CREATE INDEX idx_environmental_permits_project ON public.environmental_permits(project_id);
CREATE INDEX idx_environmental_permits_status ON public.environmental_permits(status);
CREATE INDEX idx_environmental_permits_type ON public.environmental_permits(permit_type);
CREATE INDEX idx_environmental_permits_agency ON public.environmental_permits(issuing_agency);
CREATE INDEX idx_environmental_permits_expiration ON public.environmental_permits(expiration_date);

CREATE INDEX idx_environmental_assessments_permit ON public.environmental_assessments(permit_id);
CREATE INDEX idx_environmental_assessments_company ON public.environmental_assessments(company_id);
CREATE INDEX idx_environmental_assessments_stage ON public.environmental_assessments(nepa_process_stage);

CREATE INDEX idx_permit_compliance_events_permit ON public.permit_compliance_events(permit_id);
CREATE INDEX idx_permit_compliance_events_type ON public.permit_compliance_events(event_type);
CREATE INDEX idx_permit_compliance_events_date ON public.permit_compliance_events(event_date);

CREATE INDEX idx_environmental_monitoring_permit ON public.environmental_monitoring(permit_id);
CREATE INDEX idx_environmental_monitoring_company ON public.environmental_monitoring(company_id);
CREATE INDEX idx_environmental_monitoring_type ON public.environmental_monitoring(monitoring_type);
CREATE INDEX idx_environmental_monitoring_date ON public.environmental_monitoring(measurement_date);

CREATE INDEX idx_agency_coordination_permit ON public.agency_coordination(permit_id);
CREATE INDEX idx_agency_coordination_company ON public.agency_coordination(company_id);
CREATE INDEX idx_agency_coordination_status ON public.agency_coordination(status);

-- Create function to generate permit numbers
CREATE OR REPLACE FUNCTION public.generate_permit_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  permit_num TEXT;
BEGIN
  SELECT nextval('public.permit_number_seq') INTO next_num;
  permit_num := 'ENV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN permit_num;
END;
$$;

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS public.permit_number_seq START 1;

-- Create trigger to set permit numbers
CREATE OR REPLACE FUNCTION public.set_permit_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.permit_number IS NULL OR NEW.permit_number = '' THEN
    NEW.permit_number := generate_permit_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_permit_number_trigger
  BEFORE INSERT ON public.environmental_permits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_permit_number();