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