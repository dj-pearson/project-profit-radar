-- Create call logs table for Twilio integration (retry with fixed policies)
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  
  -- Call participants
  caller_id UUID REFERENCES auth.users(id),
  caller_phone TEXT NOT NULL,
  callee_phone TEXT NOT NULL,
  
  -- Related records
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  
  -- Call details
  call_sid TEXT UNIQUE,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  status TEXT CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled')),
  duration_seconds INTEGER DEFAULT 0,
  
  -- Call recording
  recording_url TEXT,
  recording_sid TEXT,
  recording_duration_seconds INTEGER,
  
  -- Transcription
  transcription TEXT,
  transcription_status TEXT CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Sentiment analysis
  sentiment_score NUMERIC(3,2),
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  sentiment_confidence NUMERIC(3,2),
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Basic policy - users can view/manage call logs for their company
CREATE POLICY "Company members manage call logs"
  ON public.call_logs
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_company ON public.call_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON public.call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON public.call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_contact ON public.call_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON public.call_logs(started_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_call_logs_timestamp
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;