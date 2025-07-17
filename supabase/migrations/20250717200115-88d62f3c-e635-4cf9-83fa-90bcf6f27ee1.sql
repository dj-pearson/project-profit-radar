-- Create table for company admin settings
CREATE TABLE public.company_admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Company Branding
  company_logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3b82f6',
  secondary_color VARCHAR(7) DEFAULT '#1e40af', 
  custom_theme JSONB DEFAULT '{}',
  email_signature TEXT,
  
  -- User Management Settings
  user_invite_settings JSONB DEFAULT '{
    "require_approval": false,
    "default_role": "office_staff",
    "auto_activate": true,
    "welcome_email": true
  }',
  
  -- Security Policies
  security_policies JSONB DEFAULT '{
    "password_min_length": 8,
    "require_special_chars": true,
    "require_numbers": true,
    "session_timeout_hours": 24,
    "max_login_attempts": 5,
    "lockout_duration_minutes": 30,
    "ip_whitelist": [],
    "require_2fa": false
  }',
  
  -- Custom Fields Configuration
  custom_fields JSONB DEFAULT '{
    "projects": [],
    "contacts": [],
    "tasks": [],
    "estimates": []
  }',
  
  -- Workflow Automation
  workflow_settings JSONB DEFAULT '{
    "auto_approve_estimates_under": null,
    "auto_assign_tasks": false,
    "notification_rules": [],
    "approval_workflows": []
  }',
  
  -- Integration Settings
  integration_config JSONB DEFAULT '{
    "quickbooks": {
      "enabled": false,
      "auto_sync": false,
      "sync_frequency": "daily"
    },
    "email": {
      "provider": "default",
      "smtp_settings": {}
    },
    "calendar": {
      "enabled": false,
      "default_calendar": "google"
    }
  }',
  
  -- Data Retention Policies
  data_retention JSONB DEFAULT '{
    "project_data_retention_years": 7,
    "document_retention_years": 10,
    "backup_frequency": "daily",
    "auto_archive_completed_projects": true,
    "archive_after_months": 12
  }',
  
  -- Billing Configuration
  billing_settings JSONB DEFAULT '{
    "auto_billing": false,
    "default_payment_terms": "net_30",
    "late_fee_percentage": 0,
    "accept_online_payments": false,
    "payment_methods": ["check", "ach"]
  }',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id),
  updated_by UUID REFERENCES public.user_profiles(id)
);

-- Enable RLS
ALTER TABLE public.company_admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view their company admin settings" 
ON public.company_admin_settings 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
);

CREATE POLICY "Admins can manage their company admin settings" 
ON public.company_admin_settings 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
);

CREATE POLICY "Root admins can manage all company admin settings" 
ON public.company_admin_settings 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- Create update trigger
CREATE TRIGGER update_company_admin_settings_updated_at
BEFORE UPDATE ON public.company_admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for company custom fields
CREATE TABLE public.company_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'textarea')),
  field_options JSONB DEFAULT '{}', -- For select fields, validation rules, etc.
  applies_to TEXT NOT NULL CHECK (applies_to IN ('projects', 'contacts', 'tasks', 'estimates', 'invoices')),
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id),
  
  UNIQUE(company_id, field_name, applies_to)
);

-- Enable RLS for custom fields
ALTER TABLE public.company_custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom fields
CREATE POLICY "Users can view their company custom fields" 
ON public.company_custom_fields 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage their company custom fields" 
ON public.company_custom_fields 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
);

-- Create update trigger for custom fields
CREATE TRIGGER update_company_custom_fields_updated_at
BEFORE UPDATE ON public.company_custom_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();