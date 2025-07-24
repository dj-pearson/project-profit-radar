-- Fix missing tables causing 406 errors
-- Migration created: 2025-01-15

-- Check if seo_configurations table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seo_configurations') THEN
        -- Create SEO configurations table
        CREATE TABLE public.seo_configurations (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          site_name TEXT NOT NULL DEFAULT 'Build Desk',
          site_description TEXT DEFAULT 'Construction Management Platform for SMB Contractors',
          site_keywords TEXT[] DEFAULT ARRAY['construction', 'project management', 'contractor software', 'building'],
          default_og_image TEXT,
          google_analytics_id TEXT,
          google_search_console_id TEXT,
          bing_webmaster_id TEXT,
          yandex_webmaster_id TEXT,
          google_ads_id TEXT,
          facebook_pixel_id TEXT,
          twitter_site TEXT DEFAULT '@builddesk',
          canonical_domain TEXT DEFAULT 'https://build-desk.com',
          robots_txt TEXT DEFAULT 'User-agent: *\nAllow: /',
          sitemap_enabled BOOLEAN DEFAULT true,
          schema_org_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE public.seo_configurations ENABLE ROW LEVEL SECURITY;

        -- Create RLS policy for root admin only access
        CREATE POLICY "Root admins can manage SEO configurations" 
        ON public.seo_configurations 
        FOR ALL 
        USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

        -- Create updated_at trigger
        CREATE TRIGGER update_seo_configurations_updated_at
        BEFORE UPDATE ON public.seo_configurations
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

        -- Insert default configuration
        INSERT INTO public.seo_configurations (
          site_name, 
          site_description, 
          canonical_domain,
          google_analytics_id
        ) VALUES (
          'Build Desk',
          'Construction Management Platform for SMB Contractors',
          'https://build-desk.com',
          '496297904'
        );
    END IF;
END $$;

-- Check if company_admin_settings table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_admin_settings') THEN
        -- Create company admin settings table
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
            "auto_invoice": false,
            "payment_terms": "Net 30",
            "late_fees": {
              "enabled": false,
              "percentage": 1.5,
              "grace_period_days": 5
            }
          }',
          
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          created_by UUID REFERENCES public.user_profiles(id),
          
          -- Ensure one settings record per company
          UNIQUE(company_id)
        );

        -- Enable RLS
        ALTER TABLE public.company_admin_settings ENABLE ROW LEVEL SECURITY;

        -- RLS Policies
        CREATE POLICY "Admins can manage their company settings"
        ON public.company_admin_settings
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.company_id = company_admin_settings.company_id
            AND up.role IN ('admin', 'root_admin')
          )
        );

        -- Create updated_at trigger
        CREATE TRIGGER update_company_admin_settings_updated_at
        BEFORE UPDATE ON public.company_admin_settings
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$; 