
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing cron jobs for blog generation to avoid duplicates
SELECT cron.unschedule('process-blog-generation-queue');

-- Create a new cron job to process the blog generation queue every 15 minutes
SELECT cron.schedule(
  'process-blog-generation-queue',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/process-blog-generation-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Also create a daily cron job to clean up old queue items (keep last 30 days)
SELECT cron.schedule(
  'cleanup-blog-queue',
  '0 2 * * *', -- Daily at 2 AM
  $$
  DELETE FROM blog_generation_queue 
  WHERE created_at < NOW() - INTERVAL '30 days' 
  AND status IN ('completed', 'failed');
  $$
);

-- Check if there are any pending items that should have been processed
SELECT 
  id, 
  company_id, 
  scheduled_for, 
  status, 
  created_at,
  CASE 
    WHEN scheduled_for <= NOW() AND status = 'pending' THEN 'OVERDUE'
    ELSE 'OK'
  END as queue_status
FROM blog_generation_queue 
WHERE status IN ('pending', 'processing')
ORDER BY scheduled_for ASC;
