-- Add missing columns that dashboard is trying to query

-- Add avatar_url to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.user_profiles.avatar_url IS 'URL to user profile avatar image';

-- Add quickbooks_connected to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS quickbooks_connected BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN public.companies.quickbooks_connected IS 'Whether QuickBooks integration is connected';

-- Add company_id to change_orders (derive from project)
ALTER TABLE public.change_orders 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

COMMENT ON COLUMN public.change_orders.company_id IS 'Company ID for easier querying (denormalized from project)';

-- Populate company_id from existing projects
UPDATE public.change_orders co
SET company_id = p.company_id
FROM public.projects p
WHERE co.project_id = p.id
AND co.company_id IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_change_orders_company_id ON public.change_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_avatar_url ON public.user_profiles(avatar_url) WHERE avatar_url IS NOT NULL;