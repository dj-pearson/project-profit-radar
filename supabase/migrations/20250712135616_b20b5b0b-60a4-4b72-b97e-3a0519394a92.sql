-- Create tables for smart import system
CREATE TABLE public.import_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  detected_data_type TEXT,
  confidence_score NUMERIC,
  source_platform TEXT,
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'analyzing',
  field_mappings JSONB DEFAULT '{}',
  preview_data JSONB DEFAULT '[]',
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.import_field_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_session_id UUID NOT NULL REFERENCES public.import_sessions(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  suggested_target_field TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL,
  data_sample TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_field_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_sessions
CREATE POLICY "Users can view company import sessions" 
ON public.import_sessions 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage import sessions" 
ON public.import_sessions 
FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role]));

-- RLS Policies for import_field_suggestions
CREATE POLICY "Users can view company field suggestions" 
ON public.import_field_suggestions 
FOR SELECT 
USING (EXISTS(
  SELECT 1 FROM public.import_sessions 
  WHERE id = import_field_suggestions.import_session_id 
  AND (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
));

CREATE POLICY "Admins can manage field suggestions" 
ON public.import_field_suggestions 
FOR ALL 
USING (EXISTS(
  SELECT 1 FROM public.import_sessions 
  WHERE id = import_field_suggestions.import_session_id 
  AND company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
));

-- Create update trigger for import_sessions
CREATE TRIGGER update_import_sessions_updated_at
BEFORE UPDATE ON public.import_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();