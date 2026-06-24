-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id),
  user_id UUID REFERENCES auth.users(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  source TEXT NOT NULL DEFAULT 'chat' CHECK (source IN ('chat', 'email', 'phone', 'web')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'support', 'system')),
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for ticket numbers
CREATE SEQUENCE public.support_ticket_number_seq;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  ticket_num TEXT;
BEGIN
  SELECT nextval('public.support_ticket_number_seq') INTO next_num;
  ticket_num := 'TKT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN ticket_num;
END;
$$;

-- Trigger to set ticket number
CREATE OR REPLACE FUNCTION public.set_support_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_support_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_support_ticket_number_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_support_ticket_number();

-- Add updated_at trigger to support_tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on support tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Users can view their company tickets" ON public.support_tickets
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR 
    user_id = auth.uid() OR
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Root admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Support staff can update assigned tickets" ON public.support_tickets
  FOR UPDATE USING (
    assigned_to = auth.uid() OR
    get_user_role(auth.uid()) = 'root_admin'
  );

-- RLS policies for support_messages
CREATE POLICY "Users can view messages for their tickets" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = support_messages.ticket_id 
      AND (
        st.company_id = get_user_company(auth.uid()) OR 
        st.user_id = auth.uid() OR
        get_user_role(auth.uid()) = 'root_admin'
      )
    )
  );

CREATE POLICY "Users can create messages for their tickets" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = support_messages.ticket_id 
      AND (
        st.company_id = get_user_company(auth.uid()) OR 
        st.user_id = auth.uid() OR
        get_user_role(auth.uid()) = 'root_admin'
      )
    )
  );

CREATE POLICY "Root admins can manage all messages" ON public.support_messages
  FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');

-- Indexes for performance
CREATE INDEX idx_support_tickets_company_id ON public.support_tickets(company_id);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at);