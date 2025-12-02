-- Add complimentary subscription tracking to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN is_complimentary BOOLEAN DEFAULT false,
ADD COLUMN complimentary_granted_by UUID REFERENCES auth.users(id),
ADD COLUMN complimentary_granted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN complimentary_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN complimentary_reason TEXT,
ADD COLUMN complimentary_type TEXT CHECK (complimentary_type IN ('permanent', 'temporary', 'root_admin')) DEFAULT 'temporary';

-- Create complimentary subscription history table
CREATE TABLE public.complimentary_subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  complimentary_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, revoked
  revoked_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on complimentary history
ALTER TABLE public.complimentary_subscription_history ENABLE ROW LEVEL SECURITY;

-- Policy for root admins to manage complimentary history
CREATE POLICY "Root admins can manage complimentary history" 
ON public.complimentary_subscription_history 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);

-- Function to automatically grant complimentary subscriptions to root admins
CREATE OR REPLACE FUNCTION public.grant_root_admin_complimentary()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is being set to root_admin role, grant complimentary subscription
  IF NEW.role = 'root_admin' AND (OLD.role IS NULL OR OLD.role != 'root_admin') THEN
    -- Update or insert subscriber record
    INSERT INTO public.subscribers (
      user_id, 
      email, 
      subscribed, 
      subscription_tier, 
      is_complimentary,
      complimentary_type,
      complimentary_granted_at,
      complimentary_reason
    ) 
    VALUES (
      NEW.id,
      (SELECT email FROM auth.users WHERE id = NEW.id),
      true,
      'enterprise',
      true,
      'root_admin',
      now(),
      'Automatic complimentary subscription for root admin'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      subscribed = true,
      subscription_tier = 'enterprise',
      is_complimentary = true,
      complimentary_type = 'root_admin',
      complimentary_granted_at = now(),
      complimentary_reason = 'Automatic complimentary subscription for root admin',
      updated_at = now();

    -- Log in history
    INSERT INTO public.complimentary_subscription_history (
      subscriber_id,
      granted_by,
      granted_at,
      complimentary_type,
      reason,
      status
    ) VALUES (
      (SELECT id FROM public.subscribers WHERE user_id = NEW.id),
      NEW.id, -- Self-granted for root admin
      now(),
      'root_admin',
      'Automatic complimentary subscription for root admin',
      'active'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for root admin complimentary subscriptions
CREATE TRIGGER grant_root_admin_complimentary_trigger
  AFTER INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_root_admin_complimentary();

-- Index for performance
CREATE INDEX idx_subscribers_complimentary ON public.subscribers(is_complimentary, complimentary_expires_at) WHERE is_complimentary = true;
CREATE INDEX idx_complimentary_history_expires ON public.complimentary_subscription_history(expires_at, status) WHERE status = 'active';