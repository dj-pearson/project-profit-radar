-- Create crew assignments table for visual scheduling
CREATE TABLE IF NOT EXISTS public.crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled')),
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent double-booking
  UNIQUE(crew_member_id, assigned_date, start_time)
);

-- Enable RLS
ALTER TABLE public.crew_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company crew assignments"
ON public.crew_assignments FOR SELECT
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage crew assignments"
ON public.crew_assignments FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'root_admin']::user_role[])
);

-- Create indexes for performance
CREATE INDEX idx_crew_assignments_company_date ON public.crew_assignments(company_id, assigned_date);
CREATE INDEX idx_crew_assignments_crew_member ON public.crew_assignments(crew_member_id, assigned_date);
CREATE INDEX idx_crew_assignments_project ON public.crew_assignments(project_id, assigned_date);

-- Add trigger for updated_at
CREATE TRIGGER update_crew_assignments_updated_at
  BEFORE UPDATE ON public.crew_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.crew_assignments IS 'Crew member assignments to projects with scheduling details';
COMMENT ON COLUMN public.crew_assignments.status IS 'Assignment status: scheduled, dispatched, in_progress, completed, cancelled';