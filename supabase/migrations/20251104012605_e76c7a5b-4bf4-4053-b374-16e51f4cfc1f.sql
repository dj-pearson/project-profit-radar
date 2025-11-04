-- Fix leads table: add missing status column
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- Create activities table for CRM (separate from lead_activities which tracks page visits)
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL,
  outcome TEXT,
  duration_minutes INTEGER,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  opportunity_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_id UUID NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON public.crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_opportunity_id ON public.crm_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created_by ON public.crm_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_activities_company_id ON public.crm_activities(company_id);

-- Enable RLS on crm_activities
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for crm_activities
CREATE POLICY "Users can view activities in their company" 
ON public.crm_activities FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create activities in their company" 
ON public.crm_activities FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update activities in their company" 
ON public.crm_activities FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete activities in their company" 
ON public.crm_activities FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid()));

-- Fix webhook_endpoints table columns if it exists
DO $$
BEGIN
  -- Check if webhook_endpoints table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhook_endpoints') THEN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'webhook_endpoints' AND column_name = 'endpoint_name') THEN
      ALTER TABLE public.webhook_endpoints ADD COLUMN endpoint_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'webhook_endpoints' AND column_name = 'events') THEN
      ALTER TABLE public.webhook_endpoints ADD COLUMN events TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'webhook_endpoints' AND column_name = 'retry_attempts') THEN
      ALTER TABLE public.webhook_endpoints ADD COLUMN retry_attempts INTEGER DEFAULT 3;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'webhook_endpoints' AND column_name = 'timeout_seconds') THEN
      ALTER TABLE public.webhook_endpoints ADD COLUMN timeout_seconds INTEGER DEFAULT 30;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'webhook_endpoints' AND column_name = 'failure_count') THEN
      ALTER TABLE public.webhook_endpoints ADD COLUMN failure_count INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;