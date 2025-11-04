-- Add missing columns to leads table (without company_id index)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC,
ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'cold',
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS project_type TEXT,
ADD COLUMN IF NOT EXISTS decision_maker BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS financing_secured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS decision_timeline TEXT,
ADD COLUMN IF NOT EXISTS next_follow_up_date DATE,
ADD COLUMN IF NOT EXISTS last_contact_date DATE;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON public.leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_lead_temperature ON public.leads(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON public.leads(lead_source);