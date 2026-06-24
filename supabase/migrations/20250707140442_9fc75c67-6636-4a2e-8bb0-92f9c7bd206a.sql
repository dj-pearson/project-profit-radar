-- Create service call dispatch system tables
CREATE TABLE public.service_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Call identification
  call_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  customer_contact_person TEXT,
  customer_company TEXT,
  
  -- Service details
  service_type TEXT NOT NULL CHECK (service_type IN ('repair', 'maintenance', 'inspection', 'emergency', 'installation', 'consultation', 'warranty_work', 'preventive_maintenance', 'other')),
  priority TEXT NOT NULL DEFAULT 'standard' CHECK (priority IN ('emergency', 'urgent', 'standard', 'low')),
  trade_required TEXT CHECK (trade_required IN ('general', 'electrical', 'plumbing', 'hvac', 'roofing', 'flooring', 'painting', 'landscaping', 'other')),
  
  -- Scheduling
  requested_date DATE,
  requested_time_start TIME,
  requested_time_end TIME,
  scheduled_date DATE,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  estimated_duration_minutes INTEGER DEFAULT 60,
  
  -- Status and lifecycle
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'scheduled', 'dispatched', 'en_route', 'on_site', 'in_progress', 'parts_needed', 'on_hold', 'completed', 'cancelled', 'rescheduled')),
  completion_status TEXT CHECK (completion_status IN ('completed', 'partially_completed', 'unable_to_complete', 'requires_follow_up')),
  
  -- Financial
  estimated_cost NUMERIC(10,2) DEFAULT 0,
  actual_cost NUMERIC(10,2) DEFAULT 0,
  parts_cost NUMERIC(10,2) DEFAULT 0,
  labor_cost NUMERIC(10,2) DEFAULT 0,
  travel_cost NUMERIC(10,2) DEFAULT 0,
  is_billable BOOLEAN DEFAULT true,
  is_warranty_work BOOLEAN DEFAULT false,
  
  -- Assignment
  assigned_technician_id UUID REFERENCES public.user_profiles(id),
  backup_technician_id UUID REFERENCES public.user_profiles(id),
  dispatcher_id UUID REFERENCES public.user_profiles(id),
  
  -- Location and access
  service_location_lat DECIMAL(10, 8),
  service_location_lng DECIMAL(11, 8),
  access_instructions TEXT,
  special_requirements TEXT,
  safety_notes TEXT,
  
  -- Equipment and parts
  equipment_needed TEXT[],
  tools_required TEXT[],
  parts_needed JSONB DEFAULT '[]'::jsonb,
  
  -- Resolution and follow-up
  work_performed TEXT,
  resolution_notes TEXT,
  customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
  customer_feedback TEXT,
  requires_follow_up BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  
  -- Communication
  customer_notified BOOLEAN DEFAULT false,
  arrival_notification_sent BOOLEAN DEFAULT false,
  completion_notification_sent BOOLEAN DEFAULT false,
  
  -- Time tracking
  dispatched_at TIMESTAMP WITH TIME ZONE,
  arrived_at TIMESTAMP WITH TIME ZONE,
  work_started_at TIMESTAMP WITH TIME ZONE,
  work_completed_at TIMESTAMP WITH TIME ZONE,
  departed_at TIMESTAMP WITH TIME ZONE,
  
  -- Documents and photos
  photos JSONB DEFAULT '[]'::jsonb,
  before_photos JSONB DEFAULT '[]'::jsonb,
  after_photos JSONB DEFAULT '[]'::jsonb,
  work_order_document_path TEXT,
  invoice_document_path TEXT,
  customer_signature_path TEXT,
  
  -- Additional tracking
  weather_conditions TEXT,
  traffic_conditions TEXT,
  technician_notes TEXT,
  internal_notes TEXT,
  
  -- Recurring service
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'semi_annually', 'annually')),
  next_service_date DATE,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service call status history for tracking
CREATE TABLE public.service_call_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_call_id UUID NOT NULL REFERENCES public.service_calls(id) ON DELETE CASCADE,
  
  -- Status change details
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  
  -- Location when status changed
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  -- Timing
  changed_by UUID REFERENCES public.user_profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create technician location tracking
CREATE TABLE public.technician_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  service_call_id UUID REFERENCES public.service_calls(id) ON DELETE SET NULL,
  
  -- Location data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  heading DECIMAL(5, 2), -- Direction in degrees
  speed DECIMAL(5, 2), -- Speed in mph
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_on_duty BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'en_route', 'on_site', 'off_duty', 'break')),
  
  -- Tracking
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parts used tracking
CREATE TABLE public.service_call_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_call_id UUID NOT NULL REFERENCES public.service_calls(id) ON DELETE CASCADE,
  
  -- Part details
  part_name TEXT NOT NULL,
  part_number TEXT,
  manufacturer TEXT,
  description TEXT,
  
  -- Quantities and costs
  quantity_used DECIMAL(10, 3) NOT NULL,
  unit_cost NUMERIC(8,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  customer_cost NUMERIC(10,2) DEFAULT 0,
  
  -- Inventory tracking
  inventory_item_id UUID, -- Reference to inventory system if exists
  supplier TEXT,
  
  -- Status
  is_warranty_covered BOOLEAN DEFAULT false,
  warranty_period_months INTEGER,
  
  -- Tracking
  added_by UUID REFERENCES public.user_profiles(id),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer service requests (for customer portal)
CREATE TABLE public.customer_service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_call_id UUID REFERENCES public.service_calls(id) ON DELETE SET NULL,
  
  -- Request details
  request_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  service_address TEXT NOT NULL,
  
  -- Service request
  issue_description TEXT NOT NULL,
  service_type TEXT NOT NULL,
  priority_requested TEXT DEFAULT 'standard',
  preferred_date DATE,
  preferred_time TEXT,
  
  -- Photos and documents
  issue_photos JSONB DEFAULT '[]'::jsonb,
  additional_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'approved', 'converted_to_call', 'declined', 'cancelled')),
  reviewed_by UUID REFERENCES public.user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Communication
  customer_ip_address INET,
  submission_method TEXT DEFAULT 'web_portal',
  customer_notified BOOLEAN DEFAULT false,
  
  -- Tracking
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service call templates for common issues
CREATE TABLE public.service_call_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Template details
  template_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  trade_required TEXT,
  description_template TEXT,
  
  -- Default settings
  estimated_duration_minutes INTEGER DEFAULT 60,
  default_priority TEXT DEFAULT 'standard',
  
  -- Pre-defined requirements
  tools_required TEXT[],
  parts_commonly_needed JSONB DEFAULT '[]'::jsonb,
  special_instructions TEXT,
  safety_requirements TEXT,
  
  -- Checklist
  pre_visit_checklist JSONB DEFAULT '[]'::jsonb,
  on_site_checklist JSONB DEFAULT '[]'::jsonb,
  completion_checklist JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_call_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_call_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_call_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service calls
CREATE POLICY "Users can view company service calls" 
ON public.service_calls 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage service calls" 
ON public.service_calls 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for status history
CREATE POLICY "Users can view company service call status history" 
ON public.service_call_status_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.service_calls sc 
    WHERE sc.id = service_call_status_history.service_call_id 
    AND (sc.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage status history" 
ON public.service_call_status_history 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.service_calls sc 
    WHERE sc.id = service_call_status_history.service_call_id 
    AND sc.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- RLS Policies for technician locations
CREATE POLICY "Users can view company technician locations" 
ON public.technician_locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = technician_locations.technician_id 
    AND (up.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Technicians can update their own location" 
ON public.technician_locations 
FOR ALL 
USING (
  technician_id = auth.uid() OR 
  (EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = technician_locations.technician_id 
    AND up.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role])
  ))
);

-- RLS Policies for service call parts
CREATE POLICY "Users can view company service call parts" 
ON public.service_call_parts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.service_calls sc 
    WHERE sc.id = service_call_parts.service_call_id 
    AND (sc.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage service call parts" 
ON public.service_call_parts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.service_calls sc 
    WHERE sc.id = service_call_parts.service_call_id 
    AND sc.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- RLS Policies for customer service requests
CREATE POLICY "Anyone can create customer service requests" 
ON public.customer_service_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Staff can view and manage customer requests" 
ON public.customer_service_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.service_calls sc 
    WHERE sc.id = customer_service_requests.service_call_id 
    AND sc.company_id = get_user_company(auth.uid())
  ) OR 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for service call templates
CREATE POLICY "Users can view company service call templates" 
ON public.service_call_templates 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage service call templates" 
ON public.service_call_templates 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- Add updated_at triggers
CREATE TRIGGER update_service_calls_updated_at
  BEFORE UPDATE ON public.service_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_service_requests_updated_at
  BEFORE UPDATE ON public.customer_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_call_templates_updated_at
  BEFORE UPDATE ON public.service_call_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_service_calls_company ON public.service_calls(company_id);
CREATE INDEX idx_service_calls_status ON public.service_calls(status);
CREATE INDEX idx_service_calls_assigned_technician ON public.service_calls(assigned_technician_id);
CREATE INDEX idx_service_calls_scheduled_date ON public.service_calls(scheduled_date);
CREATE INDEX idx_service_calls_priority ON public.service_calls(priority);
CREATE INDEX idx_service_call_status_history_call ON public.service_call_status_history(service_call_id);
CREATE INDEX idx_technician_locations_technician_time ON public.technician_locations(technician_id, recorded_at);
CREATE INDEX idx_technician_locations_active ON public.technician_locations(technician_id, is_active) WHERE is_active = true;
CREATE INDEX idx_service_call_parts_call ON public.service_call_parts(service_call_id);
CREATE INDEX idx_customer_service_requests_status ON public.customer_service_requests(status);
CREATE INDEX idx_service_call_templates_company ON public.service_call_templates(company_id);

-- Create function to generate service call numbers
CREATE OR REPLACE FUNCTION public.generate_service_call_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  call_num TEXT;
BEGIN
  SELECT nextval('public.service_call_number_seq') INTO next_num;
  call_num := 'SC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN call_num;
END;
$$;

-- Create function to generate customer request numbers
CREATE OR REPLACE FUNCTION public.generate_customer_request_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  request_num TEXT;
BEGIN
  SELECT nextval('public.customer_request_number_seq') INTO next_num;
  request_num := 'CR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN request_num;
END;
$$;

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS public.service_call_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.customer_request_number_seq START 1;

-- Create triggers to set numbers
CREATE OR REPLACE FUNCTION public.set_service_call_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.call_number IS NULL OR NEW.call_number = '' THEN
    NEW.call_number := generate_service_call_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_customer_request_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_customer_request_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_service_call_number_trigger
  BEFORE INSERT ON public.service_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.set_service_call_number();

CREATE TRIGGER set_customer_request_number_trigger
  BEFORE INSERT ON public.customer_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_request_number();

-- Create function to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_service_call_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.service_call_status_history (
      service_call_id,
      from_status,
      to_status,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_service_call_status_change_trigger
  AFTER UPDATE ON public.service_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_call_status_change();