-- Create heavy equipment management system tables
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Equipment identification
  equipment_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('excavator', 'bulldozer', 'crane', 'loader', 'grader', 'compactor', 'dump_truck', 'concrete_mixer', 'generator', 'pump', 'forklift', 'backhoe', 'skid_steer', 'trencher', 'paver', 'roller', 'scraper', 'other')),
  category TEXT CHECK (category IN ('heavy_machinery', 'construction_vehicles', 'tools', 'generators', 'safety_equipment', 'other')),
  
  -- Specifications
  make TEXT,
  model TEXT,
  year_manufactured INTEGER,
  serial_number TEXT,
  vin_number TEXT,
  engine_type TEXT,
  fuel_type TEXT CHECK (fuel_type IN ('diesel', 'gasoline', 'electric', 'hybrid', 'propane', 'natural_gas')),
  power_rating TEXT, -- e.g., "300 HP", "50 kW"
  operating_weight NUMERIC(10,2), -- in pounds or kg
  max_capacity TEXT, -- e.g., "10 tons", "500 gallons"
  
  -- Ownership and location
  ownership_type TEXT NOT NULL DEFAULT 'owned' CHECK (ownership_type IN ('owned', 'leased', 'rented', 'financed')),
  current_location TEXT,
  home_yard TEXT,
  gps_coordinates POINT,
  
  -- Financial information
  purchase_price NUMERIC(12,2),
  purchase_date DATE,
  current_value NUMERIC(12,2),
  depreciation_method TEXT CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production')),
  lease_rate_daily NUMERIC(8,2),
  lease_rate_weekly NUMERIC(8,2),
  lease_rate_monthly NUMERIC(8,2),
  
  -- Insurance and registration
  insurance_policy_number TEXT,
  insurance_expiration DATE,
  registration_number TEXT,
  registration_expiration DATE,
  inspection_due_date DATE,
  
  -- Operational status
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'repair', 'out_of_service', 'sold', 'retired')),
  operational_condition TEXT DEFAULT 'good' CHECK (operational_condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
  
  -- Utilization tracking
  total_hours NUMERIC(10,2) DEFAULT 0,
  hours_this_month NUMERIC(8,2) DEFAULT 0,
  hours_this_year NUMERIC(10,2) DEFAULT 0,
  last_hour_reading NUMERIC(10,2) DEFAULT 0,
  last_reading_date DATE,
  
  -- Maintenance tracking
  last_maintenance_date DATE,
  next_maintenance_due DATE,
  maintenance_interval_hours INTEGER DEFAULT 250, -- hours between maintenance
  maintenance_interval_months INTEGER DEFAULT 3, -- months between maintenance
  
  -- Safety and compliance
  safety_certification_required BOOLEAN DEFAULT false,
  safety_certification_expiration DATE,
  osha_compliance_notes TEXT,
  
  -- Photos and documents
  photos JSONB DEFAULT '[]'::jsonb,
  manuals_path TEXT,
  warranty_documents_path TEXT,
  
  -- Assignment
  assigned_to_project UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  assigned_operator UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  assignment_start_date DATE,
  expected_return_date DATE,
  
  -- Internal tracking
  notes TEXT,
  tags TEXT[],
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment utilization tracking table
CREATE TABLE public.equipment_utilization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Utilization period
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_hours NUMERIC(6,2) NOT NULL,
  
  -- Usage details
  operator_id UUID REFERENCES public.user_profiles(id),
  activity_type TEXT CHECK (activity_type IN ('excavation', 'hauling', 'grading', 'compaction', 'lifting', 'drilling', 'paving', 'demolition', 'loading', 'transport', 'idle', 'other')),
  activity_description TEXT,
  location TEXT,
  
  -- Performance metrics
  fuel_consumed NUMERIC(8,2), -- in gallons or liters
  fuel_cost NUMERIC(8,2),
  productivity_metric TEXT, -- e.g., "50 cubic yards moved"
  productivity_value NUMERIC(10,2),
  productivity_unit TEXT,
  
  -- Operational conditions
  weather_conditions TEXT,
  terrain_type TEXT CHECK (terrain_type IN ('flat', 'hilly', 'rough', 'paved', 'unpaved', 'wet', 'dry')),
  operating_efficiency NUMERIC(5,2), -- percentage
  
  -- Hour meter readings
  start_hour_reading NUMERIC(10,2),
  end_hour_reading NUMERIC(10,2),
  calculated_hours NUMERIC(6,2) GENERATED ALWAYS AS (end_hour_reading - start_hour_reading) STORED,
  
  -- Cost tracking
  hourly_rate NUMERIC(8,2), -- cost per hour
  daily_rate NUMERIC(10,2), -- cost per day
  total_cost NUMERIC(10,2),
  billable_hours NUMERIC(6,2),
  billable_amount NUMERIC(10,2),
  
  -- Issues and downtime
  downtime_hours NUMERIC(6,2) DEFAULT 0,
  downtime_reason TEXT,
  issues_reported TEXT,
  maintenance_required BOOLEAN DEFAULT false,
  
  -- Documentation
  photos JSONB DEFAULT '[]'::jsonb,
  work_order_reference TEXT,
  
  -- Verification
  verified_by UUID REFERENCES public.user_profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  recorded_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment maintenance schedule table
CREATE TABLE public.equipment_maintenance_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Maintenance identification
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'emergency', 'inspection', 'calibration', 'overhaul', 'seasonal')),
  maintenance_category TEXT CHECK (maintenance_category IN ('routine', 'major', 'critical', 'safety')),
  task_name TEXT NOT NULL,
  description TEXT,
  
  -- Scheduling
  frequency_type TEXT CHECK (frequency_type IN ('hours', 'days', 'weeks', 'months', 'years', 'mileage', 'cycles')),
  frequency_value INTEGER NOT NULL, -- e.g., 250 for hours, 3 for months
  
  -- Due dates and tracking
  last_completed_date DATE,
  next_due_date DATE NOT NULL,
  hours_at_last_service NUMERIC(10,2),
  next_due_hours NUMERIC(10,2),
  
  -- Lead time and planning
  lead_time_days INTEGER DEFAULT 7,
  estimated_duration_hours NUMERIC(6,2),
  estimated_cost NUMERIC(10,2),
  
  -- Requirements
  parts_required JSONB DEFAULT '[]'::jsonb,
  tools_required TEXT[],
  skills_required TEXT[],
  safety_requirements TEXT[],
  vendor_required BOOLEAN DEFAULT false,
  vendor_name TEXT,
  
  -- Priority and status
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'due', 'overdue', 'in_progress', 'completed', 'skipped', 'cancelled')),
  
  -- Documentation
  maintenance_checklist JSONB DEFAULT '[]'::jsonb,
  procedure_document_path TEXT,
  safety_procedures TEXT,
  
  -- Assignment
  assigned_technician UUID REFERENCES public.user_profiles(id),
  assigned_vendor_contact TEXT,
  
  -- Compliance
  regulatory_requirement BOOLEAN DEFAULT false,
  regulation_reference TEXT,
  certification_required BOOLEAN DEFAULT false,
  
  -- Tracking
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment maintenance records table
CREATE TABLE public.equipment_maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  maintenance_schedule_id UUID REFERENCES public.equipment_maintenance_schedule(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Maintenance identification
  work_order_number TEXT,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'emergency', 'inspection', 'calibration', 'overhaul', 'seasonal')),
  task_name TEXT NOT NULL,
  description TEXT,
  
  -- Timing
  scheduled_date DATE,
  actual_start_date DATE,
  actual_completion_date DATE,
  total_labor_hours NUMERIC(8,2),
  downtime_hours NUMERIC(8,2),
  
  -- Personnel
  performed_by UUID REFERENCES public.user_profiles(id),
  technician_names TEXT[],
  vendor_name TEXT,
  supervisor UUID REFERENCES public.user_profiles(id),
  
  -- Work performed
  work_performed TEXT NOT NULL,
  parts_used JSONB DEFAULT '[]'::jsonb,
  tools_used TEXT[],
  procedures_followed TEXT,
  
  -- Costs
  labor_cost NUMERIC(10,2) DEFAULT 0,
  parts_cost NUMERIC(10,2) DEFAULT 0,
  vendor_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  
  -- Quality and compliance
  quality_check_passed BOOLEAN DEFAULT true,
  quality_notes TEXT,
  compliance_verified BOOLEAN DEFAULT false,
  compliance_notes TEXT,
  
  -- Equipment condition
  condition_before TEXT CHECK (condition_before IN ('excellent', 'good', 'fair', 'poor', 'failed')),
  condition_after TEXT CHECK (condition_after IN ('excellent', 'good', 'fair', 'poor', 'needs_followup')),
  hour_meter_reading NUMERIC(10,2),
  
  -- Results and follow-up
  issues_found TEXT,
  recommendations TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  warranty_work BOOLEAN DEFAULT false,
  warranty_claim_number TEXT,
  
  -- Documentation
  photos_before JSONB DEFAULT '[]'::jsonb,
  photos_after JSONB DEFAULT '[]'::jsonb,
  receipts_path TEXT,
  inspection_report_path TEXT,
  
  -- Safety
  safety_incidents TEXT,
  safety_protocols_followed BOOLEAN DEFAULT true,
  
  -- Approval
  approved_by UUID REFERENCES public.user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment assignments table for project tracking
CREATE TABLE public.equipment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Assignment details
  assignment_date DATE NOT NULL,
  expected_return_date DATE,
  actual_return_date DATE,
  
  -- Personnel
  assigned_operator UUID REFERENCES public.user_profiles(id),
  project_manager UUID REFERENCES public.user_profiles(id),
  authorized_by UUID REFERENCES public.user_profiles(id),
  
  -- Usage tracking
  start_hour_reading NUMERIC(10,2),
  end_hour_reading NUMERIC(10,2),
  total_hours_assigned NUMERIC(10,2),
  
  -- Rates and costs
  hourly_rate NUMERIC(8,2),
  daily_rate NUMERIC(10,2),
  total_estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'returned', 'extended', 'cancelled')),
  assignment_reason TEXT,
  return_reason TEXT,
  
  -- Condition tracking
  condition_at_assignment TEXT CHECK (condition_at_assignment IN ('excellent', 'good', 'fair', 'poor')),
  condition_at_return TEXT CHECK (condition_at_return IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  damage_notes TEXT,
  
  -- Documentation
  assignment_checklist_completed BOOLEAN DEFAULT false,
  return_checklist_completed BOOLEAN DEFAULT false,
  photos_assignment JSONB DEFAULT '[]'::jsonb,
  photos_return JSONB DEFAULT '[]'::jsonb,
  
  -- Notes
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_utilization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment
CREATE POLICY "Users can view company equipment" 
ON public.equipment 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage equipment" 
ON public.equipment 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for equipment utilization
CREATE POLICY "Users can view company equipment utilization" 
ON public.equipment_utilization 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage equipment utilization" 
ON public.equipment_utilization 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'crew_member'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for maintenance schedule
CREATE POLICY "Users can view company maintenance schedules" 
ON public.equipment_maintenance_schedule 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage maintenance schedules" 
ON public.equipment_maintenance_schedule 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for maintenance records
CREATE POLICY "Users can view company maintenance records" 
ON public.equipment_maintenance_records 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage maintenance records" 
ON public.equipment_maintenance_records 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for equipment assignments
CREATE POLICY "Users can view company equipment assignments" 
ON public.equipment_assignments 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage equipment assignments" 
ON public.equipment_assignments 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role])
);

-- Add updated_at triggers
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_utilization_updated_at
  BEFORE UPDATE ON public.equipment_utilization
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_maintenance_schedule_updated_at
  BEFORE UPDATE ON public.equipment_maintenance_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_maintenance_records_updated_at
  BEFORE UPDATE ON public.equipment_maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_assignments_updated_at
  BEFORE UPDATE ON public.equipment_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_equipment_company ON public.equipment(company_id);
CREATE INDEX idx_equipment_type ON public.equipment(equipment_type);
CREATE INDEX idx_equipment_status ON public.equipment(status);
CREATE INDEX idx_equipment_assigned_project ON public.equipment(assigned_to_project);
CREATE INDEX idx_equipment_next_maintenance ON public.equipment(next_maintenance_due);

CREATE INDEX idx_equipment_utilization_equipment ON public.equipment_utilization(equipment_id);
CREATE INDEX idx_equipment_utilization_company ON public.equipment_utilization(company_id);
CREATE INDEX idx_equipment_utilization_date ON public.equipment_utilization(date);
CREATE INDEX idx_equipment_utilization_project ON public.equipment_utilization(project_id);

CREATE INDEX idx_maintenance_schedule_equipment ON public.equipment_maintenance_schedule(equipment_id);
CREATE INDEX idx_maintenance_schedule_due_date ON public.equipment_maintenance_schedule(next_due_date);
CREATE INDEX idx_maintenance_schedule_status ON public.equipment_maintenance_schedule(status);

CREATE INDEX idx_maintenance_records_equipment ON public.equipment_maintenance_records(equipment_id);
CREATE INDEX idx_maintenance_records_company ON public.equipment_maintenance_records(company_id);
CREATE INDEX idx_maintenance_records_date ON public.equipment_maintenance_records(actual_completion_date);

CREATE INDEX idx_equipment_assignments_equipment ON public.equipment_assignments(equipment_id);
CREATE INDEX idx_equipment_assignments_project ON public.equipment_assignments(project_id);
CREATE INDEX idx_equipment_assignments_status ON public.equipment_assignments(status);

-- Create function to generate equipment numbers
CREATE OR REPLACE FUNCTION public.generate_equipment_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  equipment_num TEXT;
BEGIN
  SELECT nextval('public.equipment_number_seq') INTO next_num;
  equipment_num := 'EQ-' || LPAD(next_num::TEXT, 5, '0');
  RETURN equipment_num;
END;
$$;

-- Create function to generate work order numbers
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  wo_num TEXT;
BEGIN
  SELECT nextval('public.work_order_number_seq') INTO next_num;
  wo_num := 'WO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN wo_num;
END;
$$;

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS public.equipment_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.work_order_number_seq START 1;

-- Create trigger to set equipment numbers
CREATE OR REPLACE FUNCTION public.set_equipment_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.equipment_number IS NULL OR NEW.equipment_number = '' THEN
    NEW.equipment_number := generate_equipment_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to set work order numbers
CREATE OR REPLACE FUNCTION public.set_work_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    NEW.work_order_number := generate_work_order_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_equipment_number_trigger
  BEFORE INSERT ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_equipment_number();

CREATE TRIGGER set_work_order_number_trigger
  BEFORE INSERT ON public.equipment_maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_work_order_number();