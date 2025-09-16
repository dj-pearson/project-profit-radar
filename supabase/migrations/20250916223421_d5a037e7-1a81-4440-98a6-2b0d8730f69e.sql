-- Create missing tables for GPS tracking and photo management

-- Create project_photos table if not exists
CREATE TABLE IF NOT EXISTS public.project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create gps_locations table if not exists  
CREATE TABLE IF NOT EXISTS public.gps_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  latitude NUMERIC(10,8) NOT NULL,
  longitude NUMERIC(11,8) NOT NULL,
  accuracy NUMERIC,
  altitude NUMERIC,
  heading NUMERIC,
  speed NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add gps_settings column to company_settings if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='gps_settings') THEN
        ALTER TABLE public.company_settings ADD COLUMN gps_settings JSONB;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_photos
CREATE POLICY "Users can view company project photos" ON public.project_photos FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "Users can insert company project photos" ON public.project_photos FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE company_id = get_user_company(auth.uid())
  ) AND user_id = auth.uid()
);

CREATE POLICY "Users can update their project photos" ON public.project_photos FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their project photos" ON public.project_photos FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for gps_locations
CREATE POLICY "Users can view company GPS locations" ON public.gps_locations FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can insert their GPS locations" ON public.gps_locations FOR INSERT
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND 
  user_id = auth.uid()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_photos_project_id ON public.project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_user_id ON public.project_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_gps_locations_company_id ON public.gps_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_gps_locations_project_id ON public.gps_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_gps_locations_timestamp ON public.gps_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_gps_locations_user_id ON public.gps_locations(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_project_photos_updated_at
  BEFORE UPDATE ON public.project_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();