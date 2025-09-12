-- Create feature_announcements table (if not exists, but we'll handle error)
CREATE TABLE IF NOT EXISTS public.feature_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'draft',
  target_audience text DEFAULT 'all',
  show_as_popup boolean DEFAULT false,
  show_in_dashboard boolean DEFAULT true,
  expires_at timestamp with time zone,
  published_at timestamp with time zone,
  image_url text,
  action_label text,
  action_url text,
  views integer DEFAULT 0,
  dismissals integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view company announcements" ON public.feature_announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.feature_announcements;

-- Create policies
CREATE POLICY "Users can view company announcements" 
ON public.feature_announcements 
FOR SELECT 
USING (company_id IS NULL OR true);

CREATE POLICY "System can manage announcements" 
ON public.feature_announcements 
FOR ALL 
USING (true);