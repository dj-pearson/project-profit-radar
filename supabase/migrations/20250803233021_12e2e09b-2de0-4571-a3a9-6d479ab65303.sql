-- Fix security warnings by properly dropping and recreating functions

-- Drop trigger first
DROP TRIGGER IF EXISTS update_channel_activity_on_message ON public.chat_messages;

-- Drop and recreate functions with proper security settings
DROP FUNCTION IF EXISTS public.create_default_project_channels();
DROP FUNCTION IF EXISTS public.update_channel_last_activity();

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';

-- Function to update last activity for channels
CREATE OR REPLACE FUNCTION public.update_channel_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_channels 
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.channel_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';

-- Recreate trigger to update channel activity on new messages
CREATE TRIGGER update_channel_activity_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_channel_last_activity();