-- Create client communication tables
CREATE TABLE public.project_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.user_profiles(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'contractor')),
  message_text TEXT,
  attachments TEXT[], -- Array of file paths
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project communication participants table
CREATE TABLE public.project_communication_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  participant_type TEXT NOT NULL CHECK (participant_type IN ('client', 'contractor', 'project_manager')),
  can_upload_files BOOLEAN NOT NULL DEFAULT true,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_communication_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project messages
CREATE POLICY "Users can view project messages they participate in" 
ON public.project_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_communication_participants pcp 
    WHERE pcp.project_id = project_messages.project_id 
    AND pcp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_messages.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  )
);

CREATE POLICY "Participants can send messages" 
ON public.project_messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.project_communication_participants pcp 
      WHERE pcp.project_id = project_messages.project_id 
      AND pcp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_messages.project_id 
      AND p.company_id = get_user_company(auth.uid())
      AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
    )
  )
);

-- RLS Policies for communication participants
CREATE POLICY "Users can view project participants" 
ON public.project_communication_participants 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_communication_participants.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  )
);

CREATE POLICY "Project managers can manage participants" 
ON public.project_communication_participants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_communication_participants.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_project_messages_updated_at
  BEFORE UPDATE ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for communication files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-communications', 'project-communications', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for communication files
CREATE POLICY "Project participants can view communication files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-communications' 
  AND EXISTS (
    SELECT 1 FROM public.project_communication_participants pcp 
    WHERE pcp.user_id = auth.uid()
    AND (storage.foldername(name))[1] = pcp.project_id::text
  )
);

CREATE POLICY "Project participants can upload communication files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-communications' 
  AND EXISTS (
    SELECT 1 FROM public.project_communication_participants pcp 
    WHERE pcp.user_id = auth.uid()
    AND pcp.can_upload_files = true
    AND (storage.foldername(name))[1] = pcp.project_id::text
  )
);

CREATE POLICY "Project participants can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-communications' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);