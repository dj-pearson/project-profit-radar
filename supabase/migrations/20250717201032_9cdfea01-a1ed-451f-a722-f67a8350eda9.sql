-- Create table for system-wide admin settings (root admin only)
CREATE TABLE public.system_admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Email Templates Configuration
  email_templates JSONB DEFAULT '{
    "welcome": {
      "subject": "Welcome to {{company_name}}",
      "template": "<h1>Welcome {{user_name}}</h1><p>Welcome to our platform.</p>",
      "enabled": true
    },
    "project_completion": {
      "subject": "Project {{project_name}} Completed",
      "template": "<h1>Project Completed</h1><p>Project {{project_name}} has been marked as completed.</p>",
      "enabled": true
    },
    "invoice_due": {
      "subject": "Invoice {{invoice_number}} Due",
      "template": "<h1>Payment Due</h1><p>Invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.</p>",
      "enabled": true
    },
    "safety_incident": {
      "subject": "Safety Incident Report - {{project_name}}",
      "template": "<h1>Safety Incident</h1><p>A safety incident has been reported on project {{project_name}}.</p>",
      "enabled": true
    }
  }'::jsonb,
  
  -- Form Builder Templates
  form_templates JSONB DEFAULT '{
    "inspection_form": {
      "name": "Site Inspection",
      "fields": [
        {"type": "text", "label": "Inspector Name", "required": true},
        {"type": "date", "label": "Inspection Date", "required": true},
        {"type": "select", "label": "Overall Status", "options": ["Pass", "Fail", "Conditional"], "required": true},
        {"type": "textarea", "label": "Notes", "required": false}
      ],
      "enabled": true
    },
    "rfi_form": {
      "name": "Request for Information",
      "fields": [
        {"type": "text", "label": "RFI Number", "required": true},
        {"type": "text", "label": "Requested By", "required": true},
        {"type": "textarea", "label": "Question/Request", "required": true},
        {"type": "date", "label": "Response Needed By", "required": true}
      ],
      "enabled": true
    },
    "change_order_form": {
      "name": "Change Order Request",
      "fields": [
        {"type": "text", "label": "Change Order Number", "required": true},
        {"type": "number", "label": "Cost Impact", "required": true},
        {"type": "number", "label": "Schedule Impact (Days)", "required": false},
        {"type": "textarea", "label": "Description of Change", "required": true}
      ],
      "enabled": true
    }
  }'::jsonb,
  
  -- Reporting Templates
  report_templates JSONB DEFAULT '{
    "project_dashboard": {
      "name": "Project Dashboard",
      "kpis": [
        {"metric": "completion_percentage", "label": "Completion %", "format": "percentage"},
        {"metric": "budget_variance", "label": "Budget Variance", "format": "currency"},
        {"metric": "schedule_variance", "label": "Schedule Variance", "format": "days"},
        {"metric": "safety_incidents", "label": "Safety Incidents", "format": "number"}
      ],
      "charts": ["timeline", "budget_breakdown", "resource_allocation"],
      "enabled": true
    },
    "financial_summary": {
      "name": "Financial Summary",
      "kpis": [
        {"metric": "total_revenue", "label": "Total Revenue", "format": "currency"},
        {"metric": "total_costs", "label": "Total Costs", "format": "currency"},
        {"metric": "profit_margin", "label": "Profit Margin", "format": "percentage"},
        {"metric": "outstanding_invoices", "label": "Outstanding Invoices", "format": "currency"}
      ],
      "charts": ["revenue_trend", "cost_breakdown", "profit_analysis"],
      "enabled": true
    },
    "safety_report": {
      "name": "Safety Report",
      "kpis": [
        {"metric": "incident_rate", "label": "Incident Rate", "format": "rate"},
        {"metric": "days_without_incident", "label": "Days Without Incident", "format": "number"},
        {"metric": "safety_training_completion", "label": "Training Completion", "format": "percentage"},
        {"metric": "compliance_score", "label": "Compliance Score", "format": "percentage"}
      ],
      "charts": ["incident_trend", "training_status", "compliance_overview"],
      "enabled": true
    }
  }'::jsonb,
  
  -- Document Management Configuration
  document_management JSONB DEFAULT '{
    "folder_structure": {
      "projects": {
        "subfolders": ["contracts", "drawings", "photos", "reports", "correspondence"],
        "naming_convention": "{{project_number}}_{{document_type}}_{{date}}"
      },
      "company": {
        "subfolders": ["policies", "templates", "certifications", "insurance"],
        "naming_convention": "{{category}}_{{document_name}}_{{version}}"
      },
      "hr": {
        "subfolders": ["employee_records", "training", "safety", "payroll"],
        "naming_convention": "{{employee_id}}_{{document_type}}_{{date}}"
      }
    },
    "approval_workflows": {
      "contract_approval": {
        "steps": [
          {"role": "project_manager", "action": "review"},
          {"role": "admin", "action": "approve"},
          {"role": "client", "action": "sign"}
        ],
        "enabled": true
      },
      "invoice_approval": {
        "steps": [
          {"role": "accounting", "action": "review"},
          {"role": "admin", "action": "approve"}
        ],
        "enabled": true
      },
      "safety_document_approval": {
        "steps": [
          {"role": "safety_officer", "action": "review"},
          {"role": "superintendent", "action": "approve"}
        ],
        "enabled": true
      }
    },
    "retention_policies": {
      "project_documents": {"years": 7, "archive_after_completion": true},
      "financial_records": {"years": 10, "archive_after_completion": false},
      "safety_records": {"years": 5, "archive_after_completion": false},
      "employee_records": {"years": 7, "archive_after_termination": true}
    },
    "version_control": {
      "enabled": true,
      "max_versions": 10,
      "auto_archive_old_versions": true
    }
  }'::jsonb,
  
  -- Global System Settings
  system_preferences JSONB DEFAULT '{
    "platform_name": "Construction Manager Pro",
    "default_currency": "USD",
    "default_timezone": "America/New_York",
    "date_format": "MM/DD/YYYY",
    "number_format": "en-US",
    "backup_frequency": "daily",
    "data_retention_days": 2555,
    "max_file_size_mb": 100,
    "allowed_file_types": [".pdf", ".docx", ".xlsx", ".jpg", ".png", ".dwg"]
  }'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id),
  updated_by UUID REFERENCES public.user_profiles(id)
);

-- Enable RLS
ALTER TABLE public.system_admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only root admins can access system-wide settings
CREATE POLICY "Root admins can manage system admin settings" 
ON public.system_admin_settings 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- Create update trigger
CREATE TRIGGER update_system_admin_settings_updated_at
BEFORE UPDATE ON public.system_admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_admin_settings (id) 
VALUES (gen_random_uuid());

-- Create table for custom form definitions
CREATE TABLE public.custom_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL CHECK (form_type IN ('inspection', 'rfi', 'change_order', 'safety', 'quality', 'custom')),
  form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_system_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for custom forms
ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom forms
CREATE POLICY "Root admins can manage all custom forms" 
ON public.custom_forms 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Users can view active forms" 
ON public.custom_forms 
FOR SELECT 
USING (is_active = true);

-- Create update trigger for custom forms
CREATE TRIGGER update_custom_forms_updated_at
BEFORE UPDATE ON public.custom_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();