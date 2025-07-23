-- Create lead funnels table
CREATE TABLE public.lead_funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('trial_signup', 'newsletter_signup', 'contact_form', 'demo_request', 'custom')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_steps INTEGER DEFAULT 0,
  total_subscribers INTEGER DEFAULT 0,
  completion_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create funnel steps table
CREATE TABLE public.funnel_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.lead_funnels(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  email_template_id UUID REFERENCES public.email_templates(id),
  delay_amount INTEGER NOT NULL DEFAULT 0,
  delay_unit TEXT NOT NULL DEFAULT 'days' CHECK (delay_unit IN ('minutes', 'hours', 'days', 'weeks')),
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  open_rate NUMERIC DEFAULT 0,
  click_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, step_order)
);

-- Create funnel subscribers table
CREATE TABLE public.funnel_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.lead_funnels(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'unsubscribed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  next_email_scheduled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, subscriber_id)
);

-- Create funnel email queue table
CREATE TABLE public.funnel_email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_subscriber_id UUID NOT NULL REFERENCES public.funnel_subscribers(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
  email_template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create funnel analytics table
CREATE TABLE public.funnel_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.lead_funnels(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('entered', 'email_sent', 'email_opened', 'email_clicked', 'completed', 'unsubscribed')),
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lead_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead_funnels
CREATE POLICY "Staff can manage company lead funnels"
ON public.lead_funnels FOR ALL
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role]));

CREATE POLICY "Users can view company lead funnels"
ON public.lead_funnels FOR SELECT
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

-- Create RLS policies for funnel_steps
CREATE POLICY "Staff can manage funnel steps"
ON public.funnel_steps FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.lead_funnels lf 
  WHERE lf.id = funnel_steps.funnel_id 
  AND lf.company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
));

CREATE POLICY "Users can view funnel steps"
ON public.funnel_steps FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.lead_funnels lf 
  WHERE lf.id = funnel_steps.funnel_id 
  AND (lf.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
));

-- Create RLS policies for funnel_subscribers
CREATE POLICY "Staff can manage funnel subscribers"
ON public.funnel_subscribers FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.lead_funnels lf 
  WHERE lf.id = funnel_subscribers.funnel_id 
  AND lf.company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
));

CREATE POLICY "Users can view funnel subscribers"
ON public.funnel_subscribers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.lead_funnels lf 
  WHERE lf.id = funnel_subscribers.funnel_id 
  AND (lf.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
));

-- Create RLS policies for funnel_email_queue
CREATE POLICY "Staff can view funnel email queue"
ON public.funnel_email_queue FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.funnel_subscribers fs
  JOIN public.lead_funnels lf ON lf.id = fs.funnel_id
  WHERE fs.id = funnel_email_queue.funnel_subscriber_id 
  AND (lf.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
));

CREATE POLICY "System can manage funnel email queue"
ON public.funnel_email_queue FOR ALL
WITH CHECK (true);

-- Create RLS policies for funnel_analytics
CREATE POLICY "Staff can view funnel analytics"
ON public.funnel_analytics FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.lead_funnels lf 
  WHERE lf.id = funnel_analytics.funnel_id 
  AND (lf.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
));

CREATE POLICY "System can insert funnel analytics"
ON public.funnel_analytics FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_lead_funnels_company_id ON public.lead_funnels(company_id);
CREATE INDEX idx_lead_funnels_trigger_event ON public.lead_funnels(trigger_event);
CREATE INDEX idx_funnel_steps_funnel_id ON public.funnel_steps(funnel_id);
CREATE INDEX idx_funnel_steps_order ON public.funnel_steps(funnel_id, step_order);
CREATE INDEX idx_funnel_subscribers_funnel_id ON public.funnel_subscribers(funnel_id);
CREATE INDEX idx_funnel_subscribers_status ON public.funnel_subscribers(status);
CREATE INDEX idx_funnel_email_queue_scheduled_at ON public.funnel_email_queue(scheduled_at);
CREATE INDEX idx_funnel_email_queue_status ON public.funnel_email_queue(status);
CREATE INDEX idx_funnel_analytics_funnel_id ON public.funnel_analytics(funnel_id);
CREATE INDEX idx_funnel_analytics_event_type ON public.funnel_analytics(event_type);

-- Create trigger for updating updated_at columns
CREATE TRIGGER update_lead_funnels_updated_at
  BEFORE UPDATE ON public.lead_funnels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funnel_steps_updated_at
  BEFORE UPDATE ON public.funnel_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funnel_subscribers_updated_at
  BEFORE UPDATE ON public.funnel_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funnel_email_queue_updated_at
  BEFORE UPDATE ON public.funnel_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to add subscriber to funnel
CREATE OR REPLACE FUNCTION public.add_subscriber_to_funnel(
  p_funnel_id UUID,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_subscriber_id UUID;
  v_funnel_subscriber_id UUID;
  v_first_step RECORD;
BEGIN
  -- Get company_id from funnel
  SELECT company_id INTO v_company_id
  FROM public.lead_funnels
  WHERE id = p_funnel_id AND is_active = true;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Funnel not found or inactive';
  END IF;
  
  -- Create or get subscriber
  INSERT INTO public.email_subscribers (company_id, email, first_name, last_name, source)
  VALUES (v_company_id, p_email, p_first_name, p_last_name, p_source)
  ON CONFLICT (company_id, email) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, email_subscribers.first_name),
    last_name = COALESCE(EXCLUDED.last_name, email_subscribers.last_name),
    updated_at = now()
  RETURNING id INTO v_subscriber_id;
  
  -- Add to funnel
  INSERT INTO public.funnel_subscribers (funnel_id, subscriber_id)
  VALUES (p_funnel_id, v_subscriber_id)
  ON CONFLICT (funnel_id, subscriber_id) DO UPDATE SET
    status = 'active',
    updated_at = now()
  RETURNING id INTO v_funnel_subscriber_id;
  
  -- Get first step and schedule first email
  SELECT * INTO v_first_step
  FROM public.funnel_steps
  WHERE funnel_id = p_funnel_id AND step_order = 1 AND is_active = true;
  
  IF v_first_step.id IS NOT NULL THEN
    INSERT INTO public.funnel_email_queue (
      funnel_subscriber_id,
      step_id,
      email_template_id,
      scheduled_at
    ) VALUES (
      v_funnel_subscriber_id,
      v_first_step.id,
      v_first_step.email_template_id,
      now() + (v_first_step.delay_amount || ' ' || v_first_step.delay_unit)::interval
    );
    
    -- Update next email scheduled time
    UPDATE public.funnel_subscribers
    SET next_email_scheduled_at = now() + (v_first_step.delay_amount || ' ' || v_first_step.delay_unit)::interval
    WHERE id = v_funnel_subscriber_id;
  END IF;
  
  -- Log analytics
  INSERT INTO public.funnel_analytics (funnel_id, subscriber_id, event_type, event_data)
  VALUES (p_funnel_id, v_subscriber_id, 'entered', jsonb_build_object('source', p_source));
  
  RETURN v_funnel_subscriber_id;
END;
$$;