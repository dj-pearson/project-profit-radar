-- Create OSHA requirements table
CREATE TABLE public.osha_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
  category TEXT NOT NULL CHECK (category IN ('training', 'inspection', 'documentation', 'reporting')),
  next_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_completed_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'completed', 'upcoming')),
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.osha_requirements ENABLE ROW LEVEL SECURITY;

-- Create compliance log table
CREATE TABLE public.osha_compliance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID NOT NULL REFERENCES public.osha_requirements(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  project_id UUID,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  evidence_photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.osha_compliance_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for osha_requirements
CREATE POLICY "Companies can manage their OSHA requirements"
  ON public.osha_requirements
  FOR ALL
  USING (company_id = get_user_company(auth.uid()));

-- Create RLS policies for osha_compliance_log  
CREATE POLICY "Companies can manage their compliance logs"
  ON public.osha_compliance_log
  FOR ALL
  USING (company_id = get_user_company(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_osha_requirements_updated_at
  BEFORE UPDATE ON public.osha_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default OSHA requirements for new companies
INSERT INTO public.osha_requirements (company_id, title, description, frequency, category, next_due_date) 
SELECT 
  c.id,
  'Daily Safety Inspection',
  'Conduct daily safety inspection of work areas, equipment, and personnel protective equipment',
  'daily',
  'inspection',
  (now() + interval '1 day')
FROM public.companies c;

INSERT INTO public.osha_requirements (company_id, title, description, frequency, category, next_due_date)
SELECT 
  c.id,
  'Weekly Toolbox Talk',
  'Conduct weekly safety meeting with all crew members covering current hazards and safety procedures',
  'weekly', 
  'training',
  (now() + interval '1 week')
FROM public.companies c;

INSERT INTO public.osha_requirements (company_id, title, description, frequency, category, next_due_date)
SELECT 
  c.id,
  'Monthly Safety Documentation Review',
  'Review and update safety documentation, incident reports, and compliance records',
  'monthly',
  'documentation', 
  (now() + interval '1 month')
FROM public.companies c;

INSERT INTO public.osha_requirements (company_id, title, description, frequency, category, next_due_date)
SELECT 
  c.id,
  'Quarterly OSHA 300 Log Review',
  'Review and analyze OSHA 300 injury and illness log for trends and corrective actions',
  'quarterly',
  'reporting',
  (now() + interval '3 months')
FROM public.companies c;