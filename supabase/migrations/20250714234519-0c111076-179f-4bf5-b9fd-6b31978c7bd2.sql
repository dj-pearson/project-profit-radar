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
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Staff can manage equipment assignments" 
ON public.equipment_assignments FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'root_admin'])
);

-- Add trigger for updated_at
CREATE TRIGGER update_equipment_assignments_updated_at
BEFORE UPDATE ON public.equipment_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check equipment availability
CREATE OR REPLACE FUNCTION public.check_equipment_availability(
  p_equipment_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_requested_quantity INTEGER DEFAULT 1,
  p_exclude_assignment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_quantity INTEGER := 0;
  assigned_quantity INTEGER := 0;
  available_quantity INTEGER := 0;
  overlapping_assignments JSONB := '[]'::JSONB;
  assignment_record RECORD;
BEGIN
  -- Get total equipment quantity (assuming equipment table has quantity field)
  -- If not, we'll default to 1 for now
  total_quantity := 1;
  
  -- Calculate assigned quantity during the requested period
  SELECT COALESCE(SUM(ea.assigned_quantity), 0)
  INTO assigned_quantity
  FROM public.equipment_assignments ea
  WHERE ea.equipment_id = p_equipment_id
    AND ea.assignment_status IN ('planned', 'active')
    AND ea.start_date <= p_end_date
    AND ea.end_date >= p_start_date
    AND (p_exclude_assignment_id IS NULL OR ea.id != p_exclude_assignment_id);
  
  -- Calculate available quantity
  available_quantity := total_quantity - assigned_quantity;
  
  -- Get overlapping assignments for detailed view
  FOR assignment_record IN
    SELECT 
      ea.id,
      ea.project_id,
      p.name as project_name,
      ea.assigned_quantity,
      ea.start_date,
      ea.end_date,
      ea.assignment_status
    FROM public.equipment_assignments ea
    JOIN public.projects p ON p.id = ea.project_id
    WHERE ea.equipment_id = p_equipment_id
      AND ea.assignment_status IN ('planned', 'active')
      AND ea.start_date <= p_end_date
      AND ea.end_date >= p_start_date
      AND (p_exclude_assignment_id IS NULL OR ea.id != p_exclude_assignment_id)
  LOOP
    overlapping_assignments := overlapping_assignments || jsonb_build_object(
      'assignment_id', assignment_record.id,
      'project_id', assignment_record.project_id,
      'project_name', assignment_record.project_name,
      'quantity', assignment_record.assigned_quantity,
      'start_date', assignment_record.start_date,
      'end_date', assignment_record.end_date,
      'status', assignment_record.assignment_status
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_quantity', total_quantity,
    'assigned_quantity', assigned_quantity,
    'available_quantity', available_quantity,
    'is_available', available_quantity >= p_requested_quantity,
    'overlapping_assignments', overlapping_assignments
  );
END;
$$;

-- Create function to get equipment schedule
CREATE OR REPLACE FUNCTION public.get_equipment_schedule(
  p_company_id UUID,
  p_equipment_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  equipment_id UUID,
  equipment_name TEXT,
  assignment_id UUID,
  project_id UUID,
  project_name TEXT,
  assigned_quantity INTEGER,
  start_date DATE,
  end_date DATE,
  assignment_status TEXT,
  days_duration INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.equipment_id,
    'Equipment Item' as equipment_name, -- We'll update this when we have equipment names
    ea.id as assignment_id,
    ea.project_id,
    p.name as project_name,
    ea.assigned_quantity,
    ea.start_date,
    ea.end_date,
    ea.assignment_status,
    (ea.end_date - ea.start_date + 1) as days_duration
  FROM public.equipment_assignments ea
  JOIN public.projects p ON p.id = ea.project_id
  WHERE ea.company_id = p_company_id
    AND (p_equipment_id IS NULL OR ea.equipment_id = p_equipment_id)
    AND (p_start_date IS NULL OR ea.end_date >= p_start_date)
    AND (p_end_date IS NULL OR ea.start_date <= p_end_date)
    AND ea.assignment_status IN ('planned', 'active', 'completed')
  ORDER BY ea.equipment_id, ea.start_date;
END;
$$;