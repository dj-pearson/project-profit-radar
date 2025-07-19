-- Step 3: Incident Response System for SOC Compliance (Fixed)

-- Create incident response tables
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  incident_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  incident_type TEXT NOT NULL,
  source TEXT,
  reported_by UUID,
  assigned_to UUID,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_summary TEXT,
  impact_assessment JSONB DEFAULT '{}',
  timeline JSONB DEFAULT '[]',
  evidence JSONB DEFAULT '[]',
  lessons_learned TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incident response team table
CREATE TABLE IF NOT EXISTS public.incident_response_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
  specializations TEXT[],
  escalation_level INTEGER DEFAULT 1,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incident response playbooks table
CREATE TABLE IF NOT EXISTS public.incident_response_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  incident_types TEXT[],
  severity_levels TEXT[],
  steps JSONB NOT NULL DEFAULT '[]',
  responsibilities JSONB DEFAULT '{}',
  escalation_criteria JSONB DEFAULT '{}',
  communication_plan JSONB DEFAULT '{}',
  estimated_duration_minutes INTEGER,
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  last_updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incident activities/timeline table
CREATE TABLE IF NOT EXISTS public.incident_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.security_incidents(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('status_change', 'assignment', 'comment', 'evidence_added', 'escalation', 'communication')),
  description TEXT NOT NULL,
  performed_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incident metrics table
CREATE TABLE IF NOT EXISTS public.incident_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  incident_id UUID NOT NULL REFERENCES public.security_incidents(id) ON DELETE CASCADE,
  detection_time_minutes INTEGER,
  acknowledgment_time_minutes INTEGER,
  response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,
  escalation_count INTEGER DEFAULT 0,
  false_positive BOOLEAN DEFAULT false,
  business_impact_score INTEGER,
  technical_impact_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(incident_id)  -- Ensure one metrics record per incident
);

-- Enable RLS on all tables
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_response_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_response_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_metrics ENABLE ROW LEVEL SECURITY;

-- Create simplified RLS policies using admin check
CREATE POLICY "Admins can view all incidents" 
ON public.security_incidents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Admins can manage all incidents" 
ON public.security_incidents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Admins can view response team" 
ON public.incident_response_team 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Admins can manage response team" 
ON public.incident_response_team 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Admins can view playbooks" 
ON public.incident_response_playbooks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Admins can manage playbooks" 
ON public.incident_response_playbooks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Admins can view incident activities" 
ON public.incident_activities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Admins can create incident activities" 
ON public.incident_activities 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Admins can view incident metrics" 
ON public.incident_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "System can manage incident metrics" 
ON public.incident_metrics 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_incidents_company_id ON public.security_incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON public.security_incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incident_response_team_company_id ON public.incident_response_team(company_id);
CREATE INDEX IF NOT EXISTS idx_incident_response_playbooks_company_id ON public.incident_response_playbooks(company_id);
CREATE INDEX IF NOT EXISTS idx_incident_activities_incident_id ON public.incident_activities(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_metrics_company_id ON public.incident_metrics(company_id);

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_security_incidents_updated_at ON public.security_incidents;
CREATE TRIGGER update_security_incidents_updated_at
BEFORE UPDATE ON public.security_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_incident_response_team_updated_at ON public.incident_response_team;
CREATE TRIGGER update_incident_response_team_updated_at
BEFORE UPDATE ON public.incident_response_team
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_incident_response_playbooks_updated_at ON public.incident_response_playbooks;
CREATE TRIGGER update_incident_response_playbooks_updated_at
BEFORE UPDATE ON public.incident_response_playbooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate incident numbers
CREATE OR REPLACE FUNCTION public.generate_incident_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  incident_num TEXT;
BEGIN
  -- Create sequence if it doesn't exist
  PERFORM pg_get_serial_sequence('public.security_incidents', 'incident_number');
EXCEPTION
  WHEN OTHERS THEN
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.incident_number_seq START 1';
END;
BEGIN
  SELECT nextval('public.incident_number_seq') INTO next_num;
  incident_num := 'INC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN incident_num;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for incident numbers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'incident_number_seq') THEN
    CREATE SEQUENCE public.incident_number_seq START 1;
  END IF;
END $$;

-- Create trigger to set incident number
CREATE OR REPLACE FUNCTION public.set_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
    NEW.incident_number := generate_incident_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_incident_number_trigger ON public.security_incidents;
CREATE TRIGGER set_incident_number_trigger
BEFORE INSERT ON public.security_incidents
FOR EACH ROW
EXECUTE FUNCTION public.set_incident_number();

-- Create function to calculate incident metrics
CREATE OR REPLACE FUNCTION public.calculate_incident_metrics(p_incident_id UUID)
RETURNS VOID AS $$
DECLARE
  incident_record RECORD;
  detection_time INTEGER := 0;
  acknowledgment_time INTEGER;
  response_time INTEGER;
  resolution_time INTEGER;
BEGIN
  -- Get incident details
  SELECT * INTO incident_record 
  FROM public.security_incidents 
  WHERE id = p_incident_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate metrics (base all times from detected_at)
  IF incident_record.acknowledged_at IS NOT NULL THEN
    acknowledgment_time := EXTRACT(EPOCH FROM (incident_record.acknowledged_at - incident_record.detected_at)) / 60;
  END IF;
  
  IF incident_record.reported_at IS NOT NULL THEN
    response_time := EXTRACT(EPOCH FROM (incident_record.reported_at - incident_record.detected_at)) / 60;
  END IF;
  
  IF incident_record.resolved_at IS NOT NULL THEN
    resolution_time := EXTRACT(EPOCH FROM (incident_record.resolved_at - incident_record.detected_at)) / 60;
  END IF;
  
  -- Insert or update metrics
  INSERT INTO public.incident_metrics (
    company_id, incident_id, detection_time_minutes, 
    acknowledgment_time_minutes, response_time_minutes, resolution_time_minutes
  ) VALUES (
    incident_record.company_id, p_incident_id, detection_time,
    acknowledgment_time, response_time, resolution_time
  ) ON CONFLICT (incident_id) DO UPDATE SET
    acknowledgment_time_minutes = EXCLUDED.acknowledgment_time_minutes,
    response_time_minutes = EXCLUDED.response_time_minutes,
    resolution_time_minutes = EXCLUDED.resolution_time_minutes;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;