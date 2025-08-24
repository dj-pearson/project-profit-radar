-- Fix the CRON job to properly call the social-post-scheduler function
-- First, remove the existing broken jobs
SELECT cron.unschedule('social-media-auto-scheduler');
SELECT cron.unschedule('social-post-scheduler-cron');

-- Create a new CRON job that properly calls the social-post-scheduler every hour
SELECT cron.schedule(
  'social-media-automation',
  '0 * * * *', -- every hour
  $$
  SELECT
    net.http_post(
        url:='https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-post-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ5NTU0NCwiZXhwIjoyMDY3MDcxNTQ0fQ.oxtduha4D2ae4OBgBtLyVN5urBa8KQl6iq2ILa5VBQY"}'::jsonb,
        body:='{"manual_trigger": false}'::jsonb
    ) as request_id;
  $$
);