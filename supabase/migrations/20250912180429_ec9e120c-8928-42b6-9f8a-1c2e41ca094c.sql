-- Create feature_announcements table
CREATE TABLE public.feature_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'draft',
  target_audience text DEFAULT 'all',
  show_as_popup boolean DEFAULT false,
  show_in_dashboard boolean DEFAULT true,
  expires_at timestamp with time zone,
  published_at timestamp with time zone,
  image_url text,
  action_label text,
  action_url text,
  views integer DEFAULT 0,
  dismissals integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_announcements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company announcements" 
ON public.feature_announcements 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR company_id IS NULL);

CREATE POLICY "Admins can manage announcements" 
ON public.feature_announcements 
FOR ALL 
USING (
  (company_id = get_user_company(auth.uid()) OR company_id IS NULL) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  project_id uuid REFERENCES public.projects(id),
  channel_id uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  message_type text DEFAULT 'text',
  reply_to uuid REFERENCES public.chat_messages(id),
  attachments jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company messages" 
ON public.chat_messages 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (company_id = get_user_company(auth.uid()) AND user_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_updated_at_announcements
BEFORE UPDATE ON public.feature_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_updated_at_chat
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();