-- Fix the next_generation_at for existing settings and queue the next generation
UPDATE blog_auto_generation_settings 
SET next_generation_at = public.calculate_next_generation_time(
  generation_frequency, 
  generation_time, 
  generation_timezone
),
updated_at = now()
WHERE is_enabled = true AND next_generation_at IS NULL;

-- Insert a queue item for the next generation
INSERT INTO blog_generation_queue (
  company_id,
  scheduled_for,
  ai_provider,
  ai_model,
  generation_type,
  priority
)
SELECT 
  company_id,
  public.calculate_next_generation_time(
    generation_frequency, 
    generation_time, 
    generation_timezone
  ),
  preferred_ai_provider,
  preferred_model,
  'scheduled',
  5
FROM blog_auto_generation_settings 
WHERE is_enabled = true
ON CONFLICT DO NOTHING;

-- Re-create the cron job with proper permissions using service role
SELECT cron.schedule(
  'process-blog-generation-queue',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/process-blog-generation-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ5NTU0NCwiZXhwIjoyMDY3MDcxNTQ0fQ.o7opCWl7FNClL7pxiCnL8UlLnLv3xKwfVUdEqbLO6i0"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);