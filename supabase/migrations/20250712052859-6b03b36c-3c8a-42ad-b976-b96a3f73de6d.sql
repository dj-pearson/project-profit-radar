-- Create company_settings table for storing all company-specific configuration
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Feature toggles
  enable_project_management BOOLEAN NOT NULL DEFAULT true,
  enable_time_tracking BOOLEAN NOT NULL DEFAULT true,
  enable_financial_management BOOLEAN NOT NULL DEFAULT true,
  enable_document_management BOOLEAN NOT NULL DEFAULT true,
  enable_crm BOOLEAN NOT NULL DEFAULT true,
  enable_safety_management BOOLEAN NOT NULL DEFAULT true,
  enable_mobile_access BOOLEAN NOT NULL DEFAULT true,
  enable_reporting BOOLEAN NOT NULL DEFAULT true,
  
  -- Notification settings
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  project_update_notifications BOOLEAN NOT NULL DEFAULT true,
  due_date_reminders BOOLEAN NOT NULL DEFAULT true,
  safety_alerts BOOLEAN NOT NULL DEFAULT true,
  
  -- UI/UX settings
  company_logo TEXT,
  primary_color TEXT NOT NULL DEFAULT '#3b82f6',
  default_project_view TEXT NOT NULL DEFAULT 'dashboard',
  
  -- Business settings
  default_working_hours TEXT NOT NULL DEFAULT '8:00 AM - 5:00 PM',
  time_zone TEXT NOT NULL DEFAULT 'America/New_York',
  fiscal_year_start TEXT NOT NULL DEFAULT 'January',
  default_markup DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  
  -- Additional settings (for future expansion)
  additional_settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id),
  
  -- Ensure one settings record per company
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage their company settings"
ON public.company_settings
FOR ALL
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

CREATE POLICY "Users can view their company settings"
ON public.company_settings
FOR SELECT
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

-- Create trigger to update updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create default settings for existing companies
INSERT INTO public.company_settings (company_id, created_by)
SELECT 
  id as company_id,
  (SELECT user_profiles.id FROM user_profiles WHERE user_profiles.company_id = companies.id AND user_profiles.role IN ('admin', 'root_admin') LIMIT 1) as created_by
FROM public.companies
WHERE id NOT IN (SELECT company_id FROM public.company_settings);

-- Add helpful indexes
CREATE INDEX idx_company_settings_company_id ON public.company_settings(company_id);
CREATE INDEX idx_company_settings_updated_at ON public.company_settings(updated_at);