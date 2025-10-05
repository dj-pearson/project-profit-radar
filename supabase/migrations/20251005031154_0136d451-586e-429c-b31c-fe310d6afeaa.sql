-- Enable real-time for time_entries table
ALTER TABLE public.time_entries REPLICA IDENTITY FULL;

-- Add time_entries to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'time_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
  END IF;
END $$;

-- Create index for faster real-time queries
CREATE INDEX IF NOT EXISTS idx_time_entries_user_updated 
ON public.time_entries(user_id, updated_at DESC);

-- Create index for active entries lookup
CREATE INDEX IF NOT EXISTS idx_time_entries_active 
ON public.time_entries(user_id, end_time) 
WHERE end_time IS NULL;