-- Create migration to add trial management scheduling
-- Set up scheduled trial management to run daily at 9 AM UTC
SELECT cron.schedule(
  'trial-management-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/trial-management',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Add new subscription statuses to companies table if not already present
DO $$
BEGIN
  -- Add the new status values to the check constraint if they don't exist
  -- This is a safe operation that won't fail if the values already exist
  ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_status_check;
  ALTER TABLE companies ADD CONSTRAINT companies_subscription_status_check 
    CHECK (subscription_status IN ('trial', 'active', 'canceled', 'past_due', 'pending', 'grace_period', 'suspended', 'converting'));
END $$;