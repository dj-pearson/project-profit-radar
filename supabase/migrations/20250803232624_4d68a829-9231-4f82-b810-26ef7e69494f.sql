-- Create collaboration hub tables with real-time support

-- Chat channels table
CREATE TABLE public.chat_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NULL,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'project', -- 'project', 'team', 'direct'
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived_at TIMESTAMP WITH TIME ZONE NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'image', 'system'
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to UUID NULL REFERENCES public.chat_messages(id),
  edited_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Channel members table
CREATE TABLE public.chat_channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(channel_id, user_id)
);

-- Activity feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'message', 'file_upload', 'task_update', 'project_update', etc.
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT, -- 'project', 'task', 'message', 'file'
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User presence table for real-time collaboration
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline', -- 'online', 'away', 'busy', 'offline'
  current_channel_id UUID NULL REFERENCES public.chat_channels(id),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Collaboration sessions for real-time document editing
CREATE TABLE public.collaboration_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NULL,
  document_id UUID NULL,
  session_type TEXT NOT NULL, -- 'document', 'whiteboard', 'video_call'
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb,
  session_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'ended'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_channels
CREATE POLICY "Users can view company channels they're members of" 
ON public.chat_channels FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) AND
  (
    NOT is_private OR 
    id IN (
      SELECT channel_id FROM public.chat_channel_members 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create channels in their company" 
ON public.chat_channels FOR INSERT 
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  created_by = auth.uid()
);

CREATE POLICY "Channel admins can update channels" 
ON public.chat_channels FOR UPDATE 
USING (
  company_id = get_user_company(auth.uid()) AND
  (
    created_by = auth.uid() OR
    id IN (
      SELECT channel_id FROM public.chat_channel_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in channels they're members of" 
ON public.chat_messages FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) AND
  channel_id IN (
    SELECT channel_id FROM public.chat_channel_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in channels they're members of" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  user_id = auth.uid() AND
  channel_id IN (
    SELECT channel_id FROM public.chat_channel_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.chat_messages FOR UPDATE 
USING (
  company_id = get_user_company(auth.uid()) AND
  user_id = auth.uid()
);

-- RLS Policies for chat_channel_members
CREATE POLICY "Users can view channel members for channels they're in" 
ON public.chat_channel_members FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) AND
  channel_id IN (
    SELECT channel_id FROM public.chat_channel_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Channel admins can manage members" 
ON public.chat_channel_members FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND
  (
    channel_id IN (
      SELECT channel_id FROM public.chat_channel_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    channel_id IN (
      SELECT id FROM public.chat_channels 
      WHERE created_by = auth.uid()
    )
  )
);

-- RLS Policies for activity_feed
CREATE POLICY "Users can view company activity feed" 
ON public.activity_feed FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create activity entries" 
ON public.activity_feed FOR INSERT 
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  user_id = auth.uid()
);

-- RLS Policies for user_presence
CREATE POLICY "Users can view company user presence" 
ON public.user_presence FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage their own presence" 
ON public.user_presence FOR ALL 
USING (user_id = auth.uid());

-- RLS Policies for collaboration_sessions
CREATE POLICY "Users can view company collaboration sessions" 
ON public.collaboration_sessions FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create collaboration sessions" 
ON public.collaboration_sessions FOR INSERT 
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  created_by = auth.uid()
);

CREATE POLICY "Session creators can update sessions" 
ON public.collaboration_sessions FOR UPDATE 
USING (
  company_id = get_user_company(auth.uid()) AND
  created_by = auth.uid()
);

-- Enable real-time for all collaboration tables
ALTER TABLE public.chat_channels REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_channel_members REPLICA IDENTITY FULL;
ALTER TABLE public.activity_feed REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.collaboration_sessions REPLICA IDENTITY FULL;

-- Add tables to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_sessions;

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_channel_created ON public.chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX idx_chat_channels_company ON public.chat_channels(company_id);
CREATE INDEX idx_chat_channels_project ON public.chat_channels(project_id);
CREATE INDEX idx_activity_feed_company_created ON public.activity_feed(company_id, created_at DESC);
CREATE INDEX idx_activity_feed_project ON public.activity_feed(project_id);
CREATE INDEX idx_user_presence_company ON public.user_presence(company_id);
CREATE INDEX idx_collaboration_sessions_company ON public.collaboration_sessions(company_id);

-- Triggers for updating timestamps
CREATE TRIGGER update_chat_channels_updated_at
  BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON public.collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default channels for new projects
CREATE OR REPLACE FUNCTION public.create_default_project_channels()
RETURNS TRIGGER AS $$
BEGIN
  -- Create general project channel
  INSERT INTO public.chat_channels (
    company_id,
    project_id,
    name,
    description,
    channel_type,
    created_by
  ) VALUES (
    NEW.company_id,
    NEW.id,
    'General - ' || NEW.name,
    'General discussion for ' || NEW.name,
    'project',
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last activity for channels
CREATE OR REPLACE FUNCTION public.update_channel_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_channels 
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.channel_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update channel activity on new messages
CREATE TRIGGER update_channel_activity_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_channel_last_activity();