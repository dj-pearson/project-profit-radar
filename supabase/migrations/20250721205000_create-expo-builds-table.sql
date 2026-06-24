-- Create table for tracking Expo builds
CREATE TABLE IF NOT EXISTS public.expo_builds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL, -- 'ios', 'android', 'all'
  profile TEXT NOT NULL, -- 'development', 'preview', 'production'
  status TEXT NOT NULL DEFAULT 'in-progress', -- 'in-progress', 'completed', 'failed', 'cancelled'
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  build_url TEXT,
  download_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expo_builds ENABLE ROW LEVEL SECURITY;

-- Create policies for Expo builds
CREATE POLICY "Root admins can manage Expo builds" 
ON public.expo_builds 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'root_admin'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS expo_builds_build_id_idx ON public.expo_builds(build_id);
CREATE INDEX IF NOT EXISTS expo_builds_platform_idx ON public.expo_builds(platform);
CREATE INDEX IF NOT EXISTS expo_builds_status_idx ON public.expo_builds(status);
CREATE INDEX IF NOT EXISTS expo_builds_triggered_at_idx ON public.expo_builds(triggered_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_expo_builds_updated_at
  BEFORE UPDATE ON public.expo_builds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column(); 