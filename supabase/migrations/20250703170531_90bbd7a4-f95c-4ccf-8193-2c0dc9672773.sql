-- Add usage tracking tables
CREATE TABLE public.usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'api_calls', 'storage_gb', 'projects', 'users', etc.
  metric_value NUMERIC NOT NULL DEFAULT 0,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for usage metrics
CREATE POLICY "Users can view their company usage metrics" 
ON public.usage_metrics FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_profiles up 
  WHERE up.id = auth.uid() AND up.company_id = usage_metrics.company_id
));

CREATE POLICY "System can manage usage metrics" 
ON public.usage_metrics FOR ALL 
USING (true);

-- Add webhook events tracking
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processing_attempts INTEGER DEFAULT 0,
  last_processing_error TEXT,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy for webhook events (admin only)
CREATE POLICY "Root admin can view webhook events" 
ON public.webhook_events FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_profiles up 
  WHERE up.id = auth.uid() AND up.role = 'root_admin'
));

-- Add payment failure tracking for dunning
CREATE TABLE public.payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL,
  failure_reason TEXT,
  attempt_count INTEGER DEFAULT 1,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  max_retries INTEGER DEFAULT 3,
  dunning_status TEXT DEFAULT 'active', -- 'active', 'paused', 'suspended'
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;

-- Policies for payment failures
CREATE POLICY "Users can view their payment failures" 
ON public.payment_failures FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.subscribers s 
  WHERE s.id = payment_failures.subscriber_id AND s.user_id = auth.uid()
));

CREATE POLICY "System can manage payment failures" 
ON public.payment_failures FOR ALL 
USING (true);

-- Add indexes for performance
CREATE INDEX idx_usage_metrics_company_period ON public.usage_metrics(company_id, billing_period_start, billing_period_end);
CREATE INDEX idx_usage_metrics_user_period ON public.usage_metrics(user_id, billing_period_start, billing_period_end);
CREATE INDEX idx_webhook_events_processed ON public.webhook_events(processed, created_at);
CREATE INDEX idx_payment_failures_retry ON public.payment_failures(next_retry_at, dunning_status) WHERE next_retry_at IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_usage_metrics_updated_at
BEFORE UPDATE ON public.usage_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_failures_updated_at
BEFORE UPDATE ON public.payment_failures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();