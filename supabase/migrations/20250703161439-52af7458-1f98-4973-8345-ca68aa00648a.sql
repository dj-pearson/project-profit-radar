-- Add renewal notification tracking to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN renewal_notification_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN billing_period TEXT DEFAULT 'monthly';

-- Add renewal notifications table for tracking
CREATE TABLE public.renewal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- '60_day', '30_day', '7_day'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.renewal_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for renewal notifications
CREATE POLICY "Users can view their renewal notifications" 
ON public.renewal_notifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.subscribers s 
  WHERE s.id = renewal_notifications.subscriber_id 
  AND s.user_id = auth.uid()
));

-- Index for performance
CREATE INDEX idx_renewal_notifications_subscriber_sent ON public.renewal_notifications(subscriber_id, sent_at);
CREATE INDEX idx_subscribers_renewal_check ON public.subscribers(subscription_end, renewal_notification_sent_at) WHERE subscribed = true;