-- Create cron job to run social scheduler every hour
SELECT cron.schedule(
  'social-media-auto-scheduler',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/cron-social-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ5NTU0NCwiZXhwIjoyMDY3MDcxNTQ0fQ.v_Qkn7o0lHXmFkz4I8CMLJCpFWWkOI5qYfP8W-Hb-is"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);