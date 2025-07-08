-- Create calendar integrations table
CREATE TABLE public.calendar_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  account_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider, account_email)
);

-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.calendar_integrations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  calendar_provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(external_id, integration_id)
);

-- Enable RLS
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar_integrations
CREATE POLICY "Users can view their company's calendar integrations" 
ON public.calendar_integrations 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can manage calendar integrations" 
ON public.calendar_integrations 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'root_admin')
  )
);

-- Create policies for calendar_events
CREATE POLICY "Users can view their company's calendar events" 
ON public.calendar_events 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "System can manage calendar events" 
ON public.calendar_events 
FOR ALL 
USING (true);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_calendar_integrations_updated_at
BEFORE UPDATE ON public.calendar_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_calendar_integrations_company_id ON public.calendar_integrations(company_id);
CREATE INDEX idx_calendar_integrations_provider ON public.calendar_integrations(provider);
CREATE INDEX idx_calendar_events_company_id ON public.calendar_events(company_id);
CREATE INDEX idx_calendar_events_integration_id ON public.calendar_events(integration_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);