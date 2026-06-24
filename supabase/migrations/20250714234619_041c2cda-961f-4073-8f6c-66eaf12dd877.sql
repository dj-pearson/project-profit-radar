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
  -- Get total equipment quantity (defaulting to 1 for now)
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