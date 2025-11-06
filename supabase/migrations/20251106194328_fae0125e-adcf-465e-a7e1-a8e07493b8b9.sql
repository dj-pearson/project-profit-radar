-- Create email sync tables for Gmail/Outlook integration
-- This enables 2-way email synchronization and automatic tracking

-- Email accounts (connected Gmail/Outlook accounts)
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Account details
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email_address TEXT NOT NULL,
  display_name TEXT,
  
  -- OAuth tokens (encrypted)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Sync settings
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_from_date TIMESTAMPTZ DEFAULT now(),
  
  -- Metadata
  provider_account_id TEXT,
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, email_address)
);

-- Email messages (synced emails)
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  
  -- Message identifiers
  provider_message_id TEXT NOT NULL,
  thread_id TEXT,
  
  -- Related CRM records
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  
  -- Email details
  subject TEXT,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  
  -- Content
  body_text TEXT,
  body_html TEXT,
  snippet TEXT,
  
  -- Metadata
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  is_read BOOLEAN DEFAULT false,
  has_attachments BOOLEAN DEFAULT false,
  labels TEXT[],
  
  -- Tracking
  opened_at TIMESTAMPTZ,
  opened_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  clicked_count INTEGER DEFAULT 0,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(email_account_id, provider_message_id)
);

-- Email attachments
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID REFERENCES public.email_messages(id) ON DELETE CASCADE,
  
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  
  -- Storage reference
  storage_path TEXT,
  
  -- Provider reference for downloading
  provider_attachment_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for email_accounts
CREATE POLICY "Users can manage their own email accounts"
  ON public.email_accounts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policies for email_messages
CREATE POLICY "Users can view emails from their accounts"
  ON public.email_messages
  FOR SELECT
  USING (
    email_account_id IN (
      SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert synced emails"
  ON public.email_messages
  FOR INSERT
  WITH CHECK (
    email_account_id IN (
      SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
    )
  );

-- Policies for email_attachments
CREATE POLICY "Users can view attachments from their emails"
  ON public.email_attachments
  FOR SELECT
  USING (
    email_message_id IN (
      SELECT id FROM public.email_messages
      WHERE email_account_id IN (
        SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON public.email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_company ON public.email_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_account ON public.email_messages(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON public.email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_lead ON public.email_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_contact ON public.email_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_sent_at ON public.email_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_attachments_message ON public.email_attachments(email_message_id);

-- Triggers for updated_at
CREATE TRIGGER update_email_accounts_timestamp
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_messages_timestamp
  BEFORE UPDATE ON public.email_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;