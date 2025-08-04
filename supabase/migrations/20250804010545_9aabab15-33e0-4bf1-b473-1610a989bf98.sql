-- Create authentication pages for the construction management platform
-- First, let's check the current structure and add missing columns to profiles table

-- Add company_id to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
    ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create project assignments table for mobile field work
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT CHECK (role IN ('project_manager', 'field_supervisor', 'crew_member', 'subcontractor')) DEFAULT 'crew_member',
  hourly_rate DECIMAL(10,2),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  removed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, user_id)
);

-- Create photo attachments table for field photos
CREATE TABLE IF NOT EXISTS public.photo_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE,
  daily_report_id UUID REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  gps_coordinates POINT,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create safety incidents table for OSHA compliance
CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  incident_type TEXT CHECK (incident_type IN ('injury', 'near_miss', 'property_damage', 'environmental', 'other')) DEFAULT 'injury',
  severity TEXT CHECK (severity IN ('minor', 'moderate', 'serious', 'critical')) DEFAULT 'minor',
  location_description TEXT,
  description TEXT NOT NULL,
  immediate_action_taken TEXT,
  investigation_notes TEXT,
  corrective_actions JSONB DEFAULT '[]',
  witnesses JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('reported', 'investigating', 'resolved')) DEFAULT 'reported',
  osha_reportable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for project assignments
CREATE POLICY "Users can view assignments for their company projects" 
  ON public.project_assignments FOR SELECT 
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    WHERE p.company_id IN (
      SELECT pr.company_id FROM public.profiles pr WHERE pr.user_id = auth.uid()
    )
  ));

CREATE POLICY "Project managers can manage assignments" 
  ON public.project_assignments FOR ALL 
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON p.company_id = pr.company_id
    WHERE pr.user_id = auth.uid() AND pr.role IN ('admin', 'project_manager')
  ));

-- Create RLS policies for photo attachments
CREATE POLICY "Users can view photos for their assigned projects" 
  ON public.photo_attachments FOR SELECT 
  USING (
    project_id IN (
      SELECT pa.project_id FROM public.project_assignments pa
      WHERE pa.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can upload photos for their assigned projects" 
  ON public.photo_attachments FOR INSERT 
  WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      project_id IS NULL OR 
      project_id IN (
        SELECT pa.project_id FROM public.project_assignments pa
        WHERE pa.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Create RLS policies for safety incidents
CREATE POLICY "Users can view incidents for their company projects" 
  ON public.safety_incidents FOR SELECT 
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    WHERE p.company_id IN (
      SELECT pr.company_id FROM public.profiles pr WHERE pr.user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can report safety incidents" 
  ON public.safety_incidents FOR INSERT 
  WITH CHECK (
    reported_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND project_id IN (
      SELECT pa.project_id FROM public.project_assignments pa
      WHERE pa.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON public.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON public.project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_attachments_project_id ON public.photo_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_photo_attachments_user_id ON public.photo_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_project_id ON public.safety_incidents(project_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_incident_date ON public.safety_incidents(incident_date);