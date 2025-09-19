-- Create user_presence table for tracking online status
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  project_id UUID,
  location TEXT,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create real_time_notifications table
CREATE TABLE IF NOT EXISTS public.real_time_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  sender_id UUID,
  type TEXT NOT NULL CHECK (type IN (
    'project_update', 
    'approval_request', 
    'safety_incident', 
    'task_assignment', 
    'budget_alert', 
    'timeline_change',
    'message',
    'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activity_feed table for real-time updates
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
CREATE POLICY "Users can view all presence data" 
ON public.user_presence 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own presence" 
ON public.user_presence 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for real_time_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.real_time_notifications 
FOR SELECT 
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can create notifications" 
ON public.real_time_notifications 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id OR sender_id IS NULL);

CREATE POLICY "Users can update their own notifications" 
ON public.real_time_notifications 
FOR UPDATE 
USING (auth.uid() = recipient_id);

-- RLS Policies for activity_feed  
CREATE POLICY "Users can view activity in their projects" 
ON public.activity_feed 
FOR SELECT 
USING (
  project_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = activity_feed.project_id 
    AND company_id = (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create activity entries" 
ON public.activity_feed 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_project_id ON public.user_presence(project_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.real_time_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.real_time_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.real_time_notifications(read_at);

CREATE INDEX IF NOT EXISTS idx_activity_feed_project_id ON public.activity_feed(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON public.activity_feed(user_id);

-- Function to update presence timestamp
CREATE OR REPLACE FUNCTION public.update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating presence timestamp
DROP TRIGGER IF EXISTS update_presence_timestamp_trigger ON public.user_presence;
CREATE TRIGGER update_presence_timestamp_trigger
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_presence_timestamp();

-- Function to clean up old presence data
CREATE OR REPLACE FUNCTION public.cleanup_old_presence()
RETURNS void AS $$
BEGIN
  -- Mark users as offline if they haven't been seen in 5 minutes
  UPDATE public.user_presence 
  SET status = 'offline'
  WHERE status != 'offline' 
  AND last_seen < now() - INTERVAL '5 minutes';
  
  -- Delete very old presence records (older than 24 hours)
  DELETE FROM public.user_presence 
  WHERE last_seen < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for all tables
ALTER publication supabase_realtime ADD TABLE public.user_presence;
ALTER publication supabase_realtime ADD TABLE public.real_time_notifications; 
ALTER publication supabase_realtime ADD TABLE public.activity_feed;

-- Set replica identity for realtime updates
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.real_time_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.activity_feed REPLICA IDENTITY FULL;