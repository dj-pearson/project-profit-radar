-- Create equipment assignments table for project-specific equipment allocation
CREATE TABLE public.equipment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  equipment_id UUID NOT NULL,
  project_id UUID NOT NULL,
  assigned_quantity INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  assignment_status TEXT NOT NULL DEFAULT 'planned', -- planned, active, completed, cancelled
  notes TEXT,
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_planned_dates CHECK (planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date),
  CONSTRAINT valid_actual_dates CHECK (actual_end_date IS NULL OR actual_start_date IS NULL OR actual_end_date >= actual_start_date),
  CONSTRAINT positive_quantity CHECK (assigned_quantity > 0)
);

-- Create index for performance
CREATE INDEX idx_equipment_assignments_equipment ON public.equipment_assignments(equipment_id);
CREATE INDEX idx_equipment_assignments_project ON public.equipment_assignments(project_id);
CREATE INDEX idx_equipment_assignments_company ON public.equipment_assignments(company_id);
CREATE INDEX idx_equipment_assignments_dates ON public.equipment_assignments(start_date, end_date);

-- Add foreign key constraints
ALTER TABLE public.equipment_assignments
ADD CONSTRAINT fk_equipment_assignments_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.equipment_assignments
ADD CONSTRAINT fk_equipment_assignments_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.equipment_assignments
ADD CONSTRAINT fk_equipment_assignments_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id);

-- Enable RLS
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view company equipment assignments" 
ON public.equipment_assignments FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'::user_role
);

CREATE POLICY "Staff can manage equipment assignments" 
ON public.equipment_assignments FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role])
);

-- Add trigger for updated_at
CREATE TRIGGER update_equipment_assignments_updated_at
BEFORE UPDATE ON public.equipment_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();